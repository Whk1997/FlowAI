'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, type User } from '@/lib/auth';

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace('/login');
          return;
        }
        setUser(me);
        setChecking(false);
      } catch {
        if (cancelled) return;
        router.replace('/login');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在验证登录状态…
      </div>
    );
  }

  return <>{children}</>;
}
