import { authFetch } from './auth-fetch';

export type Tag = {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
};

export function listTags() {
  return authFetch<Tag[]>('/tags');
}

export function createTag(name: string) {
  return authFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteTag(id: number) {
  return authFetch<{ success: boolean }>(`/tags/${id}`, {
    method: 'DELETE',
  });
}
