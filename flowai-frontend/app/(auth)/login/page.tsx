'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="rounded-2xl border border-[oklch(0.95_0.01_95/_0.14)] bg-[oklch(0.99_0.005_95/_0.92)] p-6 text-[oklch(0.22_0.02_220)] shadow-[0_1px_0_oklch(1_0_0/_0.08)_inset] backdrop-blur-md sm:p-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            欢迎回来
          </h1>
          <p className="mt-1.5 text-sm text-[oklch(0.4_0.02_220)]">
            用邮箱登录，继续你的个人工作流
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-[oklch(0.3_0.02_220)]">
              邮箱
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 border-[oklch(0.85_0.02_220)] bg-white"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className="text-[oklch(0.3_0.02_220)]">
                密码
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-[oklch(0.42_0.04_220)] underline-offset-4 transition hover:text-[oklch(0.28_0.05_220)] hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 border-[oklch(0.85_0.02_220)] bg-white"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="mt-1 h-10 w-full bg-[oklch(0.32_0.06_200)] text-[oklch(0.98_0.01_95)] hover:bg-[oklch(0.28_0.07_200)]"
          >
            {loading ? '登录中…' : '进入工作台'}
          </Button>

          <p className="text-center text-sm text-[oklch(0.45_0.02_220)]">
            还没有账号？{' '}
            <Link
              href="/register"
              className="font-medium text-[oklch(0.32_0.07_200)] underline-offset-4 hover:underline"
            >
              注册
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
