import { authFetch } from './auth-fetch';
import { API_BASE_URL, ApiError } from './api';
import { getAccessToken, refreshSession, clearTokens } from './auth';

export type NoteFile = {
  id: number;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  noteId: number;
  createdAt: string;
};

export async function uploadNoteFile(noteId: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return authFetch<NoteFile>(`/notes/${noteId}/files`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteNoteFile(fileId: number) {
  return authFetch<{ success: boolean }>(`/files/${fileId}`, {
    method: 'DELETE',
  });
}

export async function fetchFileBlob(fileId: number) {
  let accessToken = getAccessToken();
  if (!accessToken) {
    const refreshed = await refreshSession();
    accessToken = refreshed?.accessToken ?? null;
  }
  if (!accessToken) {
    clearTokens();
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Download failed');
  }

  return res.blob();
}

export function formatFileSize(bytes: number | null) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
