'use client';

import { ApiError } from '@/lib/api';
import {
  deleteTask,
  updateTask,
  type Task,
  type TaskStatus,
} from '@/lib/tasks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'TODO', title: '待办' },
  { status: 'IN_PROGRESS', title: '进行中' },
  { status: 'DONE', title: '已完成' },
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
};

export function TaskBoard({ tasks, onChange }: TaskBoardProps) {
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
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((column) => {
        const items = tasks.filter((task) => task.status === column.status);
        return (
          <section
            key={column.status}
            className="rounded-xl border bg-background p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-medium">{column.title}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                  暂无任务
                </p>
              ) : (
                items.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border bg-card p-3 shadow-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug">
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
                    {task.description ? (
                      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    ) : null}
                    {task.dueDate ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        截止 {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
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
