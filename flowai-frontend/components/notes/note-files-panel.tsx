'use client';

import { useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  deleteNoteFile,
  fetchFileBlob,
  formatFileSize,
  uploadNoteFile,
  type NoteFile,
} from '@/lib/files';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type NoteFilesPanelProps = {
  noteId: number;
  files: NoteFile[];
  onChange: (files: NoteFile[]) => void;
};

export function NoteFilesPanel({
  noteId,
  files,
  onChange,
}: NoteFilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function onSelect(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const created = await uploadNoteFile(noteId, file);
      onChange([created, ...files]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onDownload(file: NoteFile) {
    try {
      const blob = await fetchFileBlob(file.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '下载失败');
    }
  }

  async function onDelete(file: NoteFile) {
    if (!confirm(`删除附件「${file.name}」？`)) return;
    try {
      await deleteNoteFile(file.id);
      onChange(files.filter((item) => item.id !== file.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '删除失败');
    }
  }

  return (
    <Card className="gap-0 border-border/80 py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/60 bg-muted/25 px-5 py-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="font-[family-name:var(--font-display)]">
            附件
          </CardTitle>
          <CardDescription>
            支持图片 / PDF / 文档，单文件 ≤ 10MB
          </CardDescription>
        </div>
        <div className="shrink-0 pt-0.5">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,.doc,.docx"
            onChange={(e) => void onSelect(e.target.files)}
          />
          <Button
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? '上传中…' : '上传附件'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-5 py-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无附件</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.mimeType || 'unknown'} · {formatFileSize(file.sizeBytes)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => void onDownload(file)}
                >
                  下载
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void onDelete(file)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
