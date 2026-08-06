import { authFetch } from './auth-fetch';
import type { NoteFile } from './files';

export type Note = {
  id: number;
  title: string;
  content: string;
  userId: number;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  files?: NoteFile[];
};

export type NoteListItem = Pick<
  Note,
  'id' | 'title' | 'updatedAt' | 'isFavorite'
>;

export type CreateNoteInput = {
  title: string;
  content?: string;
};

export type UpdateNoteInput = {
  title?: string;
  content?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
};

export function listNotes(params?: {
  q?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.q?.trim()) {
    query.set('q', params.q.trim());
  }
  if (params?.isFavorite !== undefined) {
    query.set('isFavorite', String(params.isFavorite));
  }
  if (params?.isArchived !== undefined) {
    query.set('isArchived', String(params.isArchived));
  }
  const qs = query.toString();
  return authFetch<Note[]>(`/notes${qs ? `?${qs}` : ''}`);
}

export function getRecentNotes() {
  return authFetch<NoteListItem[]>('/notes/recent');
}

export function getNote(id: number) {
  return authFetch<Note>(`/notes/${id}`);
}

export function createNote(input: CreateNoteInput) {
  return authFetch<Note>('/notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateNote(id: number, input: UpdateNoteInput) {
  return authFetch<Note>(`/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteNote(id: number) {
  return authFetch<{ success: boolean }>(`/notes/${id}`, {
    method: 'DELETE',
  });
}
