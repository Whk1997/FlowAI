'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMe, type User } from '@/lib/auth';
import { getTaskSummary, type TaskSummary } from '@/lib/tasks';
import { getRecentNotes, type NoteListItem } from '@/lib/notes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [recentNotes, setRecentNotes] = useState<NoteListItem[]>([]);

  useEffect(() => {
    void fetchMe().then(setUser);
    void getTaskSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
    void getRecentNotes()
      .then(setRecentNotes)
      .catch(() => setRecentNotes([]));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
          <p className="text-sm text-muted-foreground">
            欢迎回来{user?.name ? `，${user.name}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/notes"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            去笔记
          </Link>
          <Link
            href="/tasks"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            去任务看板
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>全部任务</CardDescription>
            <CardTitle className="text-2xl">{summary?.total ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>待办</CardDescription>
            <CardTitle className="text-2xl">{summary?.todo ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>进行中</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.inProgress ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>已完成</CardDescription>
            <CardTitle className="text-2xl">{summary?.done ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近笔记</CardTitle>
          <CardDescription>Day 3：Markdown 笔记已接入</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentNotes.length === 0 ? (
            <p className="text-muted-foreground">还没有笔记</p>
          ) : (
            recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <span className="truncate font-medium">{note.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
