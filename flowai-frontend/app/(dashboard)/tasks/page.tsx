'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  listTasks,
  type DueFilter,
  type Priority,
  type Task,
} from '@/lib/tasks';
import { listTags, type Tag } from '@/lib/tags';
import { PageHeader } from '@/components/layout/page-header';
import { TaskBoardSkeleton } from '@/components/layout/list-skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskCreateForm } from '@/components/tasks/task-create-form';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';

const PRIORITY_FILTERS: { value: Priority; label: string }[] = [
  { value: 'HIGH', label: '高' },
  { value: 'MEDIUM', label: '中' },
  { value: 'LOW', label: '低' },
];

const DUE_FILTERS: { value: DueFilter; label: string }[] = [
  { value: 'overdue', label: '已逾期' },
  { value: 'today', label: '今天到期' },
  { value: 'week', label: '7 天内' },
  { value: 'none', label: '无截止日期' },
];

function matchesFilters(
  task: Task,
  filterTagId: number | null,
  filterPriority: Priority | null,
  filterDue: DueFilter | null,
) {
  if (filterTagId && !task.tags.some((tag) => tag.id === filterTagId)) {
    return false;
  }
  if (filterPriority && task.priority !== filterPriority) {
    return false;
  }
  if (!filterDue) return true;

  if (filterDue === 'none') return task.dueDate === null;
  if (!task.dueDate) return false;

  const due = new Date(task.dueDate);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (filterDue === 'overdue') return due < startOfToday;
  if (filterDue === 'today') return due >= startOfToday && due < startOfTomorrow;
  if (filterDue === 'week') return due >= startOfToday && due < startOfNextWeek;
  return true;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null);
  const [filterDue, setFilterDue] = useState<DueFilter | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasFilters =
    filterTagId !== null || filterPriority !== null || filterDue !== null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [taskData, tagData] = await Promise.all([
          listTasks({
            ...(filterTagId ? { tagId: filterTagId } : {}),
            ...(filterPriority ? { priority: filterPriority } : {}),
            ...(filterDue ? { due: filterDue } : {}),
          }),
          listTags(),
        ]);
        if (!cancelled) {
          setTasks(taskData);
          setTags(tagData);
        }
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
  }, [filterTagId, filterPriority, filterDue]);

  function clearFilters() {
    setFilterTagId(null);
    setFilterPriority(null);
    setFilterDue(null);
  }

  function handleTaskChange(updated: Task) {
    setTasks((prev) => {
      if (
        !matchesFilters(updated, filterTagId, filterPriority, filterDue)
      ) {
        return prev.filter((item) => item.id !== updated.id);
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="任务看板"
        description="点卡片管理标签与评论；用按钮推进状态。拆解建议可一键建成子任务。"
        actions={
          hasFilters ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              清除筛选
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3.5 rounded-2xl border border-border/70 bg-card/60 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
            优先级
          </span>
          {PRIORITY_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setFilterPriority((prev) =>
                  prev === item.value ? null : item.value,
                )
              }
            >
              <Badge
                variant={
                  filterPriority === item.value ? 'default' : 'outline'
                }
              >
                {item.label}
              </Badge>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
            截止日期
          </span>
          {DUE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setFilterDue((prev) =>
                  prev === item.value ? null : item.value,
                )
              }
            >
              <Badge
                variant={filterDue === item.value ? 'default' : 'outline'}
              >
                {item.label}
              </Badge>
            </button>
          ))}
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3.5">
            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
              标签
            </span>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  setFilterTagId((prev) => (prev === tag.id ? null : tag.id))
                }
              >
                <Badge
                  variant={filterTagId === tag.id ? 'default' : 'outline'}
                >
                  {tag.name}
                </Badge>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-1">
        <TaskCreateForm
          tags={tags}
          onCreated={(task) => {
            if (
              !matchesFilters(task, filterTagId, filterPriority, filterDue)
            ) {
              return;
            }
            setTasks((prev) => [task, ...prev]);
          }}
        />
      </div>

      <div className="mt-1">
        {loading ? (
          <TaskBoardSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <TaskBoard
            tasks={tasks}
            onChange={setTasks}
            onOpenTask={(task) => {
              setSelected(task);
              setDetailOpen(true);
            }}
          />
        )}
      </div>

      <TaskDetailDialog
        task={selected}
        open={detailOpen}
        allTags={tags}
        onOpenChange={setDetailOpen}
        onTaskChange={handleTaskChange}
        onTagsChange={setTags}
        onTasksCreated={(created) => {
          setTasks((prev) => {
            const filtered = created.filter((task) =>
              matchesFilters(task, filterTagId, filterPriority, filterDue),
            );
            return [...filtered, ...prev];
          });
        }}
      />
    </div>
  );
}
