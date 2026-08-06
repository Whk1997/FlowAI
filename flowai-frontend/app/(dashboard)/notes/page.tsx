'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { createNote, deleteNote, listNotes, type Note } from '@/lib/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listNotes({
          isArchived: showArchived,
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
  }, [showArchived, search]);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">笔记</h1>
          <p className="text-sm text-muted-foreground">
            Markdown 编辑与预览
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? '查看未归档' : '查看归档'}
          </Button>
          <Button size="sm" onClick={() => void onCreate()} disabled={creating}>
            {creating ? '创建中…' : '新建笔记'}
          </Button>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标题或正文…"
          className="max-w-md"
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

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : notes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无笔记</CardTitle>
            <CardDescription>
              {search
                ? '没有匹配的结果'
                : showArchived
                  ? '归档为空'
                  : '点击右上角新建第一篇笔记'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id} size="sm">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <Link href={`/notes/${note.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-medium">{note.title}</h2>
                    {note.isFavorite ? (
                      <span className="text-xs text-muted-foreground">收藏</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    更新于{' '}
                    {new Date(note.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </Link>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void onDelete(note)}
                >
                  删除
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
