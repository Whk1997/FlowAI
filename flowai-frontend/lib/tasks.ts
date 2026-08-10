import { authFetch } from './auth-fetch';
import type { Tag } from './tags';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  userId: number;
  parentTaskId: number | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  commentCount: number;
};

export type TaskComment = {
  id: number;
  content: string;
  taskId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskSummary = {
  todo: number;
  inProgress: number;
  done: number;
  total: number;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
  tagIds?: number[];
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  tagIds?: number[];
};

export type DueFilter = 'overdue' | 'today' | 'week' | 'none';

export function listTasks(params?: {
  status?: TaskStatus;
  priority?: Priority;
  due?: DueFilter;
  tagId?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.due) query.set('due', params.due);
  if (params?.tagId) query.set('tagId', String(params.tagId));
  const qs = query.toString();
  return authFetch<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
}

export function getTask(id: number) {
  return authFetch<Task>(`/tasks/${id}`);
}

export function getTaskSummary() {
  return authFetch<TaskSummary>('/tasks/summary');
}

export function createTask(input: CreateTaskInput) {
  return authFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTask(id: number, input: UpdateTaskInput) {
  return authFetch<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function setTaskTags(id: number, tagIds: number[]) {
  return authFetch<Task>(`/tasks/${id}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tagIds }),
  });
}

export function deleteTask(id: number) {
  return authFetch<{ success: boolean }>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export function listTaskComments(taskId: number) {
  return authFetch<TaskComment[]>(`/tasks/${taskId}/comments`);
}

export function addTaskComment(taskId: number, content: string) {
  return authFetch<TaskComment>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function deleteTaskComment(taskId: number, commentId: number) {
  return authFetch<{ success: boolean }>(
    `/tasks/${taskId}/comments/${commentId}`,
    { method: 'DELETE' },
  );
}
