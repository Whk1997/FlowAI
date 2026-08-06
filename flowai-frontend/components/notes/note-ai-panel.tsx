'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { summarizeNote } from '@/lib/ai';
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

  async function onSummarize() {
    setLoading(true);
    setError('');
    try {
      const result = await summarizeNote(noteId);
      setSummary(result.summary);
      setModel(result.model);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '总结失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>AI 总结</CardTitle>
          <CardDescription>
            基于已保存正文生成概述与要点
            {hasUnsavedChanges ? '（当前有未保存修改，请先保存）' : ''}
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => void onSummarize()}
          disabled={loading || hasUnsavedChanges}
        >
          {loading ? '生成中…' : '生成总结'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {summary ? (
          <div className="space-y-2">
            {model ? (
              <p className="text-xs text-muted-foreground">模型：{model}</p>
            ) : null}
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
              {summary}
            </pre>
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">
            点击「生成总结」获取 AI 摘要
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
