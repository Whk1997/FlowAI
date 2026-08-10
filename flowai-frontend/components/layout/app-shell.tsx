'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ListTodo, NotebookPen, Settings } from 'lucide-react';
import { logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/tasks', label: '任务', icon: ListTodo },
  { href: '/notes', label: '笔记', icon: NotebookPen },
  { href: '/settings', label: '设置', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="app-shell relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(70%_80%_at_0%_0%,oklch(0.55_0.08_195/_0.14),transparent_60%),radial-gradient(50%_60%_at_100%_0%,oklch(0.7_0.1_85/_0.1),transparent_55%)]"
      />

      <header className="sticky top-0 z-40 border-b border-border/80 bg-[oklch(0.985_0.008_95/_0.85)] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-5 md:gap-8">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-primary"
            >
              FlowAI
            </Link>
            <nav className="flex items-center gap-0.5 overflow-x-auto">
              {links.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5 opacity-80" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            退出
          </Button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
