'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { forgotPassword } from '@/lib/auth';
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>忘记密码</CardTitle>
          <CardDescription>
            输入注册邮箱。未接邮箱服务时，演示环境会直接返回重置链接。
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}
            {resetPath ? (
              <p className="text-sm">
                演示重置链接：{' '}
                <Link
                  href={resetPath}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  点击设置新密码
                </Link>
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '提交中…' : '发送重置'}
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
    </div>
  );
}
