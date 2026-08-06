'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  deleteNote,
  getNote,
  updateNote,
  type Note,
} from '@/lib/notes';
import type { NoteFile } from '@/lib/files';
import { NoteEditor } from '@/components/notes/note-editor';
import { NoteFilesPanel } from '@/components/notes/note-files-panel';
import { NoteAiPanel } from '@/components/notes/note-ai-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const noteId = Number(params.id);

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<NoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(noteId)) {
        setError('无效的笔记 ID');
        setLoading(false);
        return;
      }

      try {
        const data = await getNote(noteId);
        if (cancelled) return;
        setNote(data);
        setTitle(data.title);
        setContent(data.content);
        setFiles(data.files ?? []);
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
  }, [noteId]);

  async function onSave() {
    if (!note) return;
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateNote(note.id, {
        title: title.trim() || '未命名笔记',
        content,
      });
      setNote(updated);
      setTitle(updated.title);
      setContent(updated.content);
      setDirty(false);
      setMessage('已保存');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite() {
    if (!note) return;
    try {
      const updated = await updateNote(note.id, {
        isFavorite: !note.isFavorite,
      });
      setNote(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '操作失败');
    }
  }

  async function toggleArchive() {
    if (!note) return;
    try {
      const updated = await updateNote(note.id, {
        isArchived: !note.isArchived,
      });
      setNote(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '操作失败');
    }
  }

  async function onDelete() {
    if (!note) return;
    if (!confirm(`删除笔记「${note.title}」？`)) return;
    try {
      await deleteNote(note.id);
      router.replace('/notes');
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '删除失败');
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载笔记中…</p>;
  }

  if (error || !note) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">{error || '笔记不存在'}</p>
        <Link href="/notes" className="text-sm text-primary underline-offset-4 hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/notes"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 返回列表
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
          {dirty ? (
            <span className="text-xs text-muted-foreground">未保存</span>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => void toggleFavorite()}>
            {note.isFavorite ? '取消收藏' : '收藏'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void toggleArchive()}>
            {note.isArchived ? '取消归档' : '归档'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void onDelete()}>
            删除
          </Button>
          <Button size="sm" onClick={() => void onSave()} disabled={saving || !dirty}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>

      <Input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
          setMessage('');
        }}
        className="h-10 text-base font-medium"
        placeholder="笔记标题"
      />

      <NoteEditor
        value={content}
        onChange={(next) => {
          setContent(next);
          setDirty(true);
          setMessage('');
        }}
      />

      <NoteFilesPanel noteId={note.id} files={files} onChange={setFiles} />
      <NoteAiPanel noteId={note.id} hasUnsavedChanges={dirty} />
    </div>
  );
}
