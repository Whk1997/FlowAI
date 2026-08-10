'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  addTaskComment,
  deleteTaskComment,
  listTaskComments,
  setTaskTags,
  type Task,
  type TaskComment,
} from '@/lib/tasks';
import { createTag, type Tag } from '@/lib/tags';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskAiBreakdown } from '@/components/tasks/task-ai-breakdown';

type TaskDetailDialogProps = {
  task: Task | null;
  open: boolean;
  allTags: Tag[];
  onOpenChange: (open: boolean) => void;
  onTaskChange: (task: Task) => void;
  onTagsChange: (tags: Tag[]) => void;
  onTasksCreated?: (tasks: Task[]) => void;
};

const priorityLabel: Record<Task['priority'], string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

export function TaskDetailDialog({
  task,
  open,
  allTags,
  onOpenChange,
  onTaskChange,
  onTagsChange,
  onTasksCreated,
}: TaskDetailDialogProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    let cancelled = false;
    const taskId = task.id;

    const timer = window.setTimeout(() => {
      setLoadingComments(true);
      setError('');
      void listTaskComments(taskId)
        .then((data) => {
          if (!cancelled) setComments(data);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : '加载评论失败');
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingComments(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, task]);

  async function toggleTag(tagId: number) {
    if (!task) return;
    const selected = new Set(task.tags.map((tag) => tag.id));
    if (selected.has(tagId)) selected.delete(tagId);
    else selected.add(tagId);
    setBusy(true);
    setError('');
    try {
      const updated = await setTaskTags(task.id, [...selected]);
      onTaskChange(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '更新标签失败');
    } finally {
      setBusy(false);
    }
  }

  async function onCreateTag(e: FormEvent) {
    e.preventDefault();
    if (!task || !newTagName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const tag = await createTag(newTagName.trim());
      onTagsChange(
        [...allTags, tag].sort((a, b) => a.name.localeCompare(b.name, 'zh')),
      );
      const updated = await setTaskTags(task.id, [
        ...task.tags.map((item) => item.id),
        tag.id,
      ]);
      onTaskChange(updated);
      setNewTagName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建标签失败');
    } finally {
      setBusy(false);
    }
  }

  async function onAddComment(e: FormEvent) {
    e.preventDefault();
    if (!task || !commentText.trim()) return;
    setBusy(true);
    setError('');
    try {
      const comment = await addTaskComment(task.id, commentText.trim());
      setComments((prev) => [...prev, comment]);
      onTaskChange({ ...task, commentCount: task.commentCount + 1 });
      setCommentText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '发表评论失败');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteComment(commentId: number) {
    if (!task) return;
    if (!confirm('删除这条评论？')) return;
    setBusy(true);
    setError('');
    try {
      await deleteTaskComment(task.id, commentId);
      setComments((prev) => prev.filter((item) => item.id !== commentId));
      onTaskChange({
        ...task,
        commentCount: Math.max(0, task.commentCount - 1),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {task ? (
          <>
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
              <DialogDescription>
                优先级 {priorityLabel[task.priority]}
                {task.dueDate
                  ? ` · 截止 ${new Date(task.dueDate).toLocaleDateString('zh-CN')}`
                  : ''}
              </DialogDescription>
            </DialogHeader>

            {task.description ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">暂无描述</p>
            )}

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">标签</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">还没有标签</p>
                ) : (
                  allTags.map((tag) => {
                    const active = task.tags.some((item) => item.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleTag(tag.id)}
                      >
                        <Badge variant={active ? 'default' : 'outline'}>
                          {tag.name}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
              <form onSubmit={onCreateTag} className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="新建标签"
                  maxLength={40}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !newTagName.trim()}
                >
                  添加
                </Button>
              </form>
            </section>

            <TaskAiBreakdown
              taskId={task.id}
              onCreated={(created) => onTasksCreated?.(created)}
            />

            <section className="flex flex-col gap-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">
                  评论（{comments.length}）
                </h3>
              </div>

              {loadingComments ? (
                <p className="text-xs text-muted-foreground">加载评论…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无评论</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-lg border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="whitespace-pre-wrap text-sm">
                          {comment.content}
                        </p>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void onDeleteComment(comment.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={onAddComment} className="flex flex-col gap-2">
                <Label htmlFor="comment">写评论</Label>
                <Textarea
                  id="comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="记录进展或备注…"
                />
                <Button
                  type="submit"
                  disabled={busy || !commentText.trim()}
                  className="self-end"
                >
                  发表
                </Button>
              </form>
            </section>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
