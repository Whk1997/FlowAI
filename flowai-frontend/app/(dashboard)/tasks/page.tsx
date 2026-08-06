'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { listTasks, type Task } from '@/lib/tasks';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskCreateForm } from '@/components/tasks/task-create-form';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listTasks();
        if (!cancelled) setTasks(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">任务看板</h1>
        <p className="text-sm text-muted-foreground">
          待办 / 进行中 / 已完成，点击按钮流转状态
        </p>
      </div>

      <TaskCreateForm onCreated={(task) => setTasks((prev) => [task, ...prev])} />

      {loading ? (
        <p className="text-sm text-muted-foreground">加载任务中…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <TaskBoard tasks={tasks} onChange={setTasks} />
      )}
    </div>
  );
}
