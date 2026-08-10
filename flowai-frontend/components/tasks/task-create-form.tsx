'use client';

import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { createTask, type Priority, type Task } from '@/lib/tasks';
import type { Tag } from '@/lib/tags';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type TaskCreateFormProps = {
  tags: Tag[];
  onCreated: (task: Task) => void;
};

export function TaskCreateForm({ tags, onCreated }: TaskCreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleTag(tagId: number) {
    setTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  }

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
        tagIds,
      });
      onCreated(task);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setTagIds([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="gap-0 border-dashed border-primary/25 bg-card/70 py-0 shadow-none">
      <CardHeader className="border-b border-border/50 px-5 py-4">
        <CardTitle className="font-[family-name:var(--font-display)] text-lg">
          新建任务
        </CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="title">
              标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成任务标签与评论"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="补充上下文，可留空"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">
              优先级 <span className="text-destructive">*</span>
            </Label>
            <select
              id="priority"
              required
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
            <p className="text-[11px] text-muted-foreground">
              可选；没有明确截止日可留空
            </p>
          </div>
          {tags.length > 0 ? (
            <div className="mt-2 flex flex-col gap-3 border-t border-border/60 pt-5 md:col-span-2">
              <Label>标签（可选）</Label>
              <div className="flex flex-wrap gap-2.5">
                {tags.map((tag) => {
                  const active = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <Badge variant={active ? 'default' : 'outline'}>
                        {tag.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}
        </CardContent>
        <CardFooter className="border-t border-border/50 px-5 py-4">
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? '创建中…' : '创建任务'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
