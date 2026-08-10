'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiError } from '@/lib/api';
import { resetPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>设置新密码</CardTitle>
        <CardDescription>使用邮件/演示链接中的令牌重置密码</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {!tokenFromQuery ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="token">重置令牌</Label>
              <Input
                id="token"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">新密码（至少 6 位）</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '提交中…' : '重置密码'}
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              返回登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">加载中…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
