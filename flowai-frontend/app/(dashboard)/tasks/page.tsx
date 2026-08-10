'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { listTasks, type Task } from '@/lib/tasks';
import { listTags, type Tag } from '@/lib/tags';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskCreateForm } from '@/components/tasks/task-create-form';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [taskData, tagData] = await Promise.all([
          listTasks(filterTagId ? { tagId: filterTagId } : undefined),
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
  }, [filterTagId]);

  function handleTaskChange(updated: Task) {
    setTasks((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">任务看板</h1>
          <p className="text-sm text-muted-foreground">
            点击卡片打开详情，管理标签与评论；下方按钮流转状态
          </p>
        </div>
        {filterTagId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterTagId(null)}
          >
            清除标签筛选
          </Button>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">按标签筛选</span>
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

      <TaskCreateForm
        tags={tags}
        onCreated={(task) => {
          if (filterTagId && !task.tags.some((tag) => tag.id === filterTagId)) {
            return;
          }
          setTasks((prev) => [task, ...prev]);
        }}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">加载任务中…</p>
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

      <TaskDetailDialog
        task={selected}
        open={detailOpen}
        allTags={tags}
        onOpenChange={setDetailOpen}
        onTaskChange={handleTaskChange}
        onTagsChange={setTags}
        onTasksCreated={(created) => {
          setTasks((prev) => {
            const filtered = created.filter((task) => {
              if (
                filterTagId &&
                !task.tags.some((tag) => tag.id === filterTagId)
              ) {
                return false;
              }
              return true;
            });
            return [...filtered, ...prev];
          });
        }}
      />
    </div>
  );
}
