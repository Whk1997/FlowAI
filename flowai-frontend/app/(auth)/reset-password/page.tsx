'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiError } from '@/lib/api';
import { resetPassword } from '@/lib/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get('token') ?? '';

  const [token, setToken] = useState(tokenFromQuery);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!token.trim()) {
      setError('缺少重置令牌');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token: token.trim(), newPassword });
      setMessage('密码已重置，即将跳转登录');
      setTimeout(() => router.replace('/login'), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[oklch(0.95_0.01_95/_0.14)] bg-[oklch(0.99_0.005_95/_0.92)] p-6 text-[oklch(0.22_0.02_220)] shadow-[0_1px_0_oklch(1_0_0/_0.08)_inset] backdrop-blur-md sm:p-8">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          设置新密码
        </h1>
        <p className="mt-1.5 text-sm text-[oklch(0.4_0.02_220)]">
          使用邮件或演示链接中的令牌重置密码
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {!tokenFromQuery ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="token" className="text-[oklch(0.3_0.02_220)]">
              重置令牌
            </Label>
            <Input
              id="token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-10 border-[oklch(0.85_0.02_220)] bg-white"
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword" className="text-[oklch(0.3_0.02_220)]">
            新密码（至少 6 位）
          </Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-10 border-[oklch(0.85_0.02_220)] bg-white"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="confirmPassword"
            className="text-[oklch(0.3_0.02_220)]"
          >
            确认新密码
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 border-[oklch(0.85_0.02_220)] bg-white"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-[oklch(0.4_0.02_220)]">{message}</p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-10 w-full bg-[oklch(0.32_0.06_200)] text-[oklch(0.98_0.01_95)] hover:bg-[oklch(0.28_0.07_200)]"
        >
          {loading ? '提交中…' : '重置密码'}
        </Button>

        <p className="text-center text-sm text-[oklch(0.45_0.02_220)]">
          <Link
            href="/login"
            className="font-medium text-[oklch(0.32_0.07_200)] underline-offset-4 hover:underline"
          >
            返回登录
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell tagline="设好新密码，就能回到看板与笔记">
      <Suspense
        fallback={
          <p className="text-sm text-[oklch(0.9_0.02_95/_0.7)]">加载中…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
