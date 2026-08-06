import { authFetch } from './auth-fetch';

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

export function summarizeNote(noteId: number) {
  return authFetch<NoteSummaryResult>(`/notes/${noteId}/summarize`, {
    method: 'POST',
  });
}
