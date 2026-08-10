'use client';

import { MessageSquare } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  deleteTask,
  updateTask,
  type Task,
  type TaskStatus,
} from '@/lib/tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const columns: { status: TaskStatus; title: string; hint: string }[] = [
  { status: 'TODO', title: '待办', hint: '还没开始' },
  { status: 'IN_PROGRESS', title: '进行中', hint: '正在推进' },
  { status: 'DONE', title: '已完成', hint: '可以归档' },
];

const priorityLabel: Record<Task['priority'], string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: null,
};

const prevStatus: Record<TaskStatus, TaskStatus | null> = {
  TODO: null,
  IN_PROGRESS: 'TODO',
  DONE: 'IN_PROGRESS',
};

type TaskBoardProps = {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
  onOpenTask: (task: Task) => void;
};

export function TaskBoard({ tasks, onChange, onOpenTask }: TaskBoardProps) {
  async function setStatus(task: Task, status: TaskStatus) {
    try {
      const updated = await updateTask(task.id, { status });
      onChange(tasks.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '更新失败');
    }
  }

  async function onDelete(task: Task) {
    if (!confirm(`删除任务「${task.title}」？`)) return;
    try {
      await deleteTask(task.id);
      onChange(tasks.filter((item) => item.id !== task.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '删除失败');
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((column) => {
        const items = tasks.filter((task) => task.status === column.status);
        return (
          <section
            key={column.status}
            className="flex min-h-72 flex-col rounded-2xl border border-border/80 bg-[linear-gradient(180deg,oklch(0.99_0.005_95),oklch(0.96_0.015_200/_0.65))] p-3 shadow-[0_1px_0_oklch(1_0_0/_0.5)_inset]"
          >
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-primary">
                  {column.title}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {column.hint}
                </p>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-background/60 px-3 py-10 text-center text-xs text-muted-foreground">
                  暂无任务 · 点卡片可写评论打标签
                </p>
              ) : (
                items.map((task) => (
                  <article
                    key={task.id}
                    className="group rounded-xl border border-border/70 bg-card/95 p-3 transition hover:border-primary/30 hover:bg-card"
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => onOpenTask(task)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-snug group-hover:underline group-hover:underline-offset-2">
                          {task.title}
                        </h3>
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-1.5 py-0.5 text-[11px]',
                            task.priority === 'HIGH' &&
                              'bg-destructive/10 text-destructive',
                            task.priority === 'MEDIUM' &&
                              'bg-muted text-muted-foreground',
                            task.priority === 'LOW' &&
                              'bg-muted/60 text-muted-foreground',
                          )}
                        >
                          {priorityLabel[task.priority]}
                        </span>
                      </div>
                      {task.parentTaskId ? (
                        <Badge variant="outline" className="mt-1.5">
                          子任务 · #{task.parentTaskId}
                        </Badge>
                      ) : null}
                      {task.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                      {task.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {task.dueDate ? (
                          <span>
                            截止{' '}
                            {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {task.commentCount}
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                      {prevStatus[task.status] ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            void setStatus(task, prevStatus[task.status]!)
                          }
                        >
                          回退
                        </Button>
                      ) : null}
                      {nextStatus[task.status] ? (
                        <Button
                          size="xs"
                          onClick={() =>
                            void setStatus(task, nextStatus[task.status]!)
                          }
                        >
                          {nextStatus[task.status] === 'DONE'
                            ? '完成'
                            : '开始'}
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => void setStatus(task, 'TODO')}
                        >
                          重开
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onOpenTask(task)}
                      >
                        详情
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => void onDelete(task)}
                      >
                        删除
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
