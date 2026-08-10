'use client';

import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-border/80 bg-card/60 text-sm text-muted-foreground">
      编辑器加载中…
    </div>
  ),
});

type NoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function NoteEditor({ value, onChange }: NoteEditorProps) {
  return (
    <div
      data-color-mode="light"
      className="overflow-hidden rounded-2xl border border-border/80 shadow-none"
    >
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
