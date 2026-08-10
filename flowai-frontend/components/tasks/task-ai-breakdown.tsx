'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  acceptTaskBreakdown,
  breakdownTask,
  type TaskBreakdownSuggestion,
} from '@/lib/ai';
import type { Task } from '@/lib/tasks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type TaskAiBreakdownProps = {
  taskId: number;
  onCreated: (tasks: Task[]) => void;
};

export function TaskAiBreakdown({ taskId, onCreated }: TaskAiBreakdownProps) {
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [suggestions, setSuggestions] = useState<TaskBreakdownSuggestion[]>(
    [],
  );
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function onBreakdown() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await breakdownTask(taskId);
      setSuggestions(result.suggestions);
      setModel(result.model);
      const next: Record<number, boolean> = {};
      result.suggestions.forEach((_, index) => {
        next[index] = true;
      });
      setSelected(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '拆解失败');
    } finally {
      setLoading(false);
    }
  }

  async function onAccept() {
    const items = suggestions.filter((_, index) => selected[index]);
    if (items.length === 0) {
      setError('请至少勾选一条建议');
      return;
    }
    setAccepting(true);
    setError('');
    setMessage('');
    try {
      const result = await acceptTaskBreakdown(taskId, items);
      onCreated(result.created);
      setMessage(`已创建 ${result.created.length} 条待办任务`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败');
    } finally {
      setAccepting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">AI 拆解建议</h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void onBreakdown()}
        >
          {loading ? '拆解中…' : '生成拆解'}
        </Button>
      </div>

      {model ? (
        <p className="text-[11px] text-muted-foreground">模型：{model}</p>
      ) : null}

      {suggestions.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {suggestions.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className="rounded-lg border bg-muted/20 px-3 py-2"
            >
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(selected[index])}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [index]: e.target.checked,
                    }))
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          点击「生成拆解」获取子步骤建议，勾选后可一键建成任务
        </p>
      )}

      {suggestions.length > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">
            已选 {Object.values(selected).filter(Boolean).length} 条
          </Label>
          <Button
            type="button"
            size="sm"
            disabled={accepting}
            onClick={() => void onAccept()}
          >
            {accepting ? '创建中…' : '采纳并创建任务'}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}
