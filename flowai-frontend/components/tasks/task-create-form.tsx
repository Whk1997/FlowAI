'use client';

import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { createTask, type Priority, type Task } from '@/lib/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type TaskCreateFormProps = {
  onCreated: (task: Task) => void;
};

export function TaskCreateForm({ onCreated }: TaskCreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onCreated(task);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新建任务</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成 Day2 看板"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="description">描述</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="可选"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">优先级</Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="LOW">低</option>
              <option value="MEDIUM">中</option>
              <option value="HIGH">高</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dueDate">截止日期</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? '创建中…' : '创建任务'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
