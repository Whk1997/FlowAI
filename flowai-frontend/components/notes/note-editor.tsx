'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

type NoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function NoteEditor({ value, onChange }: NoteEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border text-sm text-muted-foreground">
        编辑器加载中…
      </div>
    );
  }

  return (
    <div data-color-mode="light" className="overflow-hidden rounded-xl border">
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? '')}
        height={420}
        preview="live"
        visibleDragbar={false}
      />
    </div>
  );
}
