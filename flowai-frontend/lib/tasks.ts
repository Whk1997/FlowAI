import { authFetch } from './auth-fetch';

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
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
};

export function listTasks(params?: { status?: TaskStatus; priority?: Priority }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  const qs = query.toString();
  return authFetch<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
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

export function deleteTask(id: number) {
  return authFetch<{ success: boolean }>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}
