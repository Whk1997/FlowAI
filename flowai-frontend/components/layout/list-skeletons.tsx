import { Skeleton } from '@/components/ui/skeleton';

/** 仪表盘「最近笔记」封面卡片骨架 */
export function RecentNotesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/80 bg-card/90"
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 笔记列表行骨架 */
export function NotesListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/80 bg-card/80 px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/5 max-w-56" />
              <Skeleton className="h-3 w-4/5 max-w-md" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex shrink-0 gap-1">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 任务看板三列骨架 */
export function TaskBoardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {['待办', '进行中', '已完成'].map((title) => (
        <section
          key={title}
          className="flex min-h-72 flex-col rounded-2xl border border-border/80 bg-[linear-gradient(180deg,oklch(0.99_0.005_95),oklch(0.96_0.015_200/_0.65))] p-3"
        >
          <div className="mb-3 flex items-end justify-between px-1">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-8 rounded-md" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {[0, 1, 2].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-border/70 bg-card/95 p-3"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-full" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-10 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
