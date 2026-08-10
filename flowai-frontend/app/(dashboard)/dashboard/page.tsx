'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, NotebookPen, ListTodo, Star } from 'lucide-react';
import { fetchMe, type User } from '@/lib/auth';
import { getTaskSummary, type TaskSummary } from '@/lib/tasks';
import { getRecentNotes, type NoteListItem } from '@/lib/notes';
import { PageHeader } from '@/components/layout/page-header';
import { RecentNotesSkeleton } from '@/components/layout/list-skeletons';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NOTE_COVERS = [
  '/note-covers/cover-1.svg',
  '/note-covers/cover-2.svg',
  '/note-covers/cover-3.svg',
  '/note-covers/cover-4.svg',
] as const;

function noteCover(id: number) {
  return NOTE_COVERS[id % NOTE_COVERS.length];
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [recentNotes, setRecentNotes] = useState<NoteListItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    void fetchMe().then(setUser);
    void getTaskSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
    void getRecentNotes()
      .then(setRecentNotes)
      .catch(() => setRecentNotes([]))
      .finally(() => setNotesLoading(false));
  }, []);

  const greeting = user?.name ? `，${user.name}` : '';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`你好${greeting}`}
        description="今天从任务推进或笔记沉淀开始——数据都在你的个人空间里。"
        actions={
          <>
            <Link
              href="/notes"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <NotebookPen className="size-3.5" />
              去笔记
            </Link>
            <Link
              href="/tasks"
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              <ListTodo className="size-3.5" />
              去任务看板
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '全部任务', value: summary?.total },
          { label: '待办', value: summary?.todo },
          { label: '进行中', value: summary?.inProgress },
          { label: '已完成', value: summary?.done },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-[0_1px_0_oklch(1_0_0/_0.6)_inset]"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {item.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums tracking-tight text-primary">
              {item.value ?? '—'}
            </p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
              最近笔记
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              继续未写完的思路
            </p>
          </div>
          <Link
            href="/notes"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            全部
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {notesLoading ? (
          <RecentNotesSkeleton />
        ) : recentNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
            还没有笔记，去写第一篇吧
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="group overflow-hidden rounded-2xl border border-border/80 bg-card/90 transition-colors hover:border-primary/30 hover:bg-card"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {/* 本地 SVG 封面，按笔记 id 轮换默认图 */}
                  <img
                    src={noteCover(note.id)}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                      {note.title}
                    </h3>
                    {note.isFavorite ? (
                      <Star className="mt-0.5 size-3.5 shrink-0 fill-amber-400 text-amber-500" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    更新于{' '}
                    {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
