'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { forgotPassword } from '@/lib/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetPath, setResetPath] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetPath('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      if (res.resetPath) {
        setResetPath(res.resetPath);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell tagline="找回密码后，继续你的个人工作流">
      <div className="rounded-2xl border border-[oklch(0.95_0.01_95/_0.14)] bg-[oklch(0.99_0.005_95/_0.92)] p-6 text-[oklch(0.22_0.02_220)] shadow-[0_1px_0_oklch(1_0_0/_0.08)_inset] backdrop-blur-md sm:p-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            忘记密码
          </h1>
          <p className="mt-1.5 text-sm text-[oklch(0.4_0.02_220)]">
            输入注册邮箱。未接邮箱服务时，演示环境会直接返回重置链接。
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

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-[oklch(0.4_0.02_220)]">{message}</p>
          ) : null}
          {resetPath ? (
            <p className="text-sm">
              演示重置链接：{' '}
              <Link
                href={resetPath}
                className="font-medium text-[oklch(0.32_0.07_200)] underline-offset-4 hover:underline"
              >
                点击设置新密码
              </Link>
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="mt-1 h-10 w-full bg-[oklch(0.32_0.06_200)] text-[oklch(0.98_0.01_95)] hover:bg-[oklch(0.28_0.07_200)]"
          >
            {loading ? '提交中…' : '发送重置'}
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
    </AuthShell>
  );
}
