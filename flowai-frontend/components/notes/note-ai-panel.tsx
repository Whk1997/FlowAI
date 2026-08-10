'use client';

import { useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { summarizeNoteStream } from '@/lib/ai';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type NoteAiPanelProps = {
  noteId: number;
  /** 未保存的编辑内容提示：总结使用服务端已保存正文 */
  hasUnsavedChanges?: boolean;
};

export function NoteAiPanel({ noteId, hasUnsavedChanges }: NoteAiPanelProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function onSummarize() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    setSummary('');
    setModel('');

    try {
      await summarizeNoteStream(noteId, {
        signal: controller.signal,
        onDelta: (text) => {
          setSummary((prev) => prev + text);
        },
        onDone: (result) => {
          setSummary(result.summary);
          setModel(result.model);
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof ApiError ? err.message : '总结失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="gap-0 border-border/80 py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/60 bg-muted/25 px-5 py-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="font-[family-name:var(--font-display)]">
            AI 总结
          </CardTitle>
          <CardDescription>
            基于已保存正文流式生成概述与要点
            {hasUnsavedChanges ? '（当前有未保存修改，请先保存）' : ''}
          </CardDescription>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => void onSummarize()}
          disabled={loading || hasUnsavedChanges}
        >
          {loading ? '生成中…' : '生成总结'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {summary ? (
          <div className="space-y-2">
            {model ? (
              <p className="text-xs text-muted-foreground">模型：{model}</p>
            ) : loading ? (
              <p className="text-xs text-muted-foreground">流式输出中…</p>
            ) : null}
            <pre className="whitespace-pre-wrap rounded-xl border border-border/70 bg-[linear-gradient(180deg,oklch(0.99_0.005_95),oklch(0.96_0.015_200/_0.5))] p-3 text-sm leading-relaxed">
              {summary}
              {loading ? <span className="animate-pulse">▍</span> : null}
            </pre>
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">
            点击「生成总结」获取 AI 摘要（SSE 流式）
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
