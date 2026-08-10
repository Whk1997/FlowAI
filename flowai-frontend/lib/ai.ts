import { API_BASE_URL, ApiError } from './api';
import { authFetch } from './auth-fetch';
import { getAccessToken, redirectToLogin, refreshSession } from './auth';
import type { Task } from './tasks';

export type NoteSummaryResult = {
  noteId: number;
  title: string;
  summary: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
};

export type TaskBreakdownSuggestion = {
  title: string;
  description: string;
};

export type TaskBreakdownResult = {
  taskId: number;
  title: string;
  suggestions: TaskBreakdownSuggestion[];
  model: string;
  usage: NoteSummaryResult['usage'];
};

export function summarizeNote(noteId: number) {
  return authFetch<NoteSummaryResult>(`/notes/${noteId}/summarize`, {
    method: 'POST',
  });
}

export function breakdownTask(taskId: number) {
  return authFetch<TaskBreakdownResult>(`/tasks/${taskId}/breakdown`, {
    method: 'POST',
  });
}

export function acceptTaskBreakdown(
  taskId: number,
  items: TaskBreakdownSuggestion[],
) {
  return authFetch<{ created: Task[] }>(`/tasks/${taskId}/breakdown/accept`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

type StreamEvent =
  | { type: 'meta'; noteId: number; title: string }
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      summary: string;
      model: string;
      usage: NoteSummaryResult['usage'];
    }
  | { type: 'error'; message: string };

async function getStreamAccessToken() {
  let accessToken = getAccessToken();
  if (!accessToken) {
    const refreshed = await refreshSession();
    accessToken = refreshed?.accessToken ?? null;
  }
  if (!accessToken) {
    redirectToLogin();
    throw new Error('Not authenticated');
  }
  return accessToken;
}

export async function summarizeNoteStream(
  noteId: number,
  handlers: {
    onDelta: (text: string) => void;
    onDone?: (result: {
      summary: string;
      model: string;
      usage: NoteSummaryResult['usage'];
    }) => void;
    signal?: AbortSignal;
  },
) {
  const run = async (accessToken: string) => {
    const res = await fetch(
      `${API_BASE_URL}/notes/${noteId}/summarize/stream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
        },
        signal: handlers.signal,
      },
    );

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const message = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || 'Stream failed';
      throw new ApiError(res.status, message);
    }

    if (!res.body) {
      throw new ApiError(500, 'Empty stream body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const line = chunk
          .split('\n')
          .find((item) => item.startsWith('data: '));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6)) as StreamEvent;
        if (payload.type === 'delta') {
          handlers.onDelta(payload.text);
        } else if (payload.type === 'done') {
          handlers.onDone?.({
            summary: payload.summary,
            model: payload.model,
            usage: payload.usage,
          });
        } else if (payload.type === 'error') {
          throw new ApiError(502, payload.message);
        }
      }
    }
  };

  try {
    await run(await getStreamAccessToken());
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const refreshed = await refreshSession();
    if (!refreshed?.accessToken) {
      redirectToLogin();
      throw error;
    }
    await run(refreshed.accessToken);
  }
}
