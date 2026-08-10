'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { Archive, Star } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type Note,
} from '@/lib/notes';
import { PageHeader } from '@/components/layout/page-header';
import { NotesListSkeleton } from '@/components/layout/list-skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

function HighlightText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const parts = useMemo(() => {
    if (!query.trim()) return [text];
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.split(new RegExp(`(${escaped})`, 'ig'));
  }, [text, query]);

  if (!query.trim()) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-sm bg-amber-200/80 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  // 输入防抖：停 350ms 后自动搜索，也可点「搜索」立即提交
  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setSearch(query.trim());
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listNotes({
          isArchived: showArchived,
          isFavorite: favoritesOnly ? true : undefined,
          q: search || undefined,
        });
        if (!cancelled) setNotes(data);
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
  }, [showArchived, favoritesOnly, search]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(query.trim());
  }

  async function onCreate() {
    setCreating(true);
    try {
      const note = await createNote({
        title: '未命名笔记',
        content: '# 新笔记\n\n开始写点什么…',
      });
      router.push(`/notes/${note.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '创建失败');
      setCreating(false);
    }
  }

  async function toggleFavorite(note: Note) {
    setBusyId(note.id);
    try {
      const updated = await updateNote(note.id, {
        isFavorite: !note.isFavorite,
      });
      setNotes((prev) => {
        const next = prev.map((item) =>
          item.id === updated.id
            ? { ...item, ...updated, snippet: item.snippet }
            : item,
        );
        if (favoritesOnly && !updated.isFavorite) {
          return next.filter((item) => item.id !== updated.id);
        }
        return next.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleArchive(note: Note) {
    setBusyId(note.id);
    try {
      const updated = await updateNote(note.id, {
        isArchived: !note.isArchived,
      });
      // 归档状态与当前列表视图不一致时，移出列表
      if (updated.isArchived !== showArchived) {
        setNotes((prev) => prev.filter((item) => item.id !== updated.id));
      } else {
        setNotes((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? { ...item, ...updated, snippet: item.snippet }
              : item,
          ),
        );
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(note: Note) {
    if (!confirm(`删除笔记「${note.title}」？`)) return;
    try {
      await deleteNote(note.id);
      setNotes((prev) => prev.filter((item) => item.id !== note.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '删除失败');
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="笔记"
        description="收藏与归档可在列表操作；搜索支持标题与正文，命中会高亮。"
        actions={
          <>
            <Button
              variant={favoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFavoritesOnly((v) => !v)}
            >
              <Star className="size-3.5" />
              {favoritesOnly ? '全部笔记' : '只看收藏'}
            </Button>
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="size-3.5" />
              {showArchived ? '查看未归档' : '查看归档'}
            </Button>
            <Button
              size="sm"
              onClick={() => void onCreate()}
              disabled={creating}
            >
              {creating ? '创建中…' : '新建笔记'}
            </Button>
          </>
        }
      />

      <form
        onSubmit={onSearch}
        className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/60 p-3"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标题或正文…"
          className="max-w-md bg-background"
        />
        <Button type="submit" variant="outline" size="sm">
          搜索
        </Button>
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setSearch('');
            }}
          >
            清除
          </Button>
        ) : null}
      </form>

      {search || favoritesOnly || showArchived ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {search ? <Badge variant="secondary">关键词：{search}</Badge> : null}
          {favoritesOnly ? <Badge variant="secondary">仅收藏</Badge> : null}
          {showArchived ? <Badge variant="secondary">归档</Badge> : null}
        </div>
      ) : null}

      {loading ? (
        <NotesListSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : notes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无笔记</CardTitle>
            <CardDescription>
              {search
                ? '没有匹配的结果'
                : favoritesOnly
                  ? '还没有收藏的笔记'
                  : showArchived
                    ? '归档为空'
                    : '点击右上角新建第一篇笔记'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-2.5">
          {notes.map((note) => (
            <Card
              key={note.id}
              size="sm"
              className="border-border/80 shadow-none transition-colors hover:border-primary/25 hover:bg-accent/30"
            >
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <Link href={`/notes/${note.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                      <HighlightText text={note.title} query={search} />
                    </h2>
                    {note.isFavorite ? (
                      <Star className="size-3.5 fill-amber-400 text-amber-500" />
                    ) : null}
                    {note.isArchived ? (
                      <Badge variant="outline">已归档</Badge>
                    ) : null}
                  </div>
                  {note.snippet ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      <HighlightText text={note.snippet} query={search} />
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    更新于 {new Date(note.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={busyId === note.id}
                    title={note.isFavorite ? '取消收藏' : '收藏'}
                    onClick={() => void toggleFavorite(note)}
                  >
                    <Star
                      className={cn(
                        'size-3.5',
                        note.isFavorite && 'fill-amber-400 text-amber-500',
                      )}
                    />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={busyId === note.id}
                    title={note.isArchived ? '取消归档' : '归档'}
                    onClick={() => void toggleArchive(note)}
                  >
                    <Archive
                      className={cn(
                        'size-3.5',
                        note.isArchived && 'text-foreground',
                      )}
                    />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => void onDelete(note)}
                  >
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
