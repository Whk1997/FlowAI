'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { register } from '@/lib/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        email,
        password,
        name: name.trim() || undefined,
      });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell tagline="几分钟建好个人工作台，任务与笔记从这里起步">
      <div className="rounded-2xl border border-[oklch(0.95_0.01_95/_0.14)] bg-[oklch(0.99_0.005_95/_0.92)] p-6 text-[oklch(0.22_0.02_220)] shadow-[0_1px_0_oklch(1_0_0/_0.08)_inset] backdrop-blur-md sm:p-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            创建账号
          </h1>
          <p className="mt-1.5 text-sm text-[oklch(0.4_0.02_220)]">
            邮箱注册，立即开始管理任务与笔记
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-[oklch(0.3_0.02_220)]">
              昵称（可选）
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 border-[oklch(0.85_0.02_220)] bg-white"
            />
          </div>
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
            <Label htmlFor="password" className="text-[oklch(0.3_0.02_220)]">
              密码（至少 6 位）
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
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
            {loading ? '注册中…' : '开始使用'}
          </Button>

          <p className="text-center text-sm text-[oklch(0.45_0.02_220)]">
            已有账号？{' '}
            <Link
              href="/login"
              className="font-medium text-[oklch(0.32_0.07_200)] underline-offset-4 hover:underline"
            >
              登录
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
