'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import {
  changePassword,
  clearTokens,
  fetchMe,
  updateProfile,
  type User,
} from '@/lib/auth';
import { PageHeader } from '@/components/layout/page-header';
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

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    void fetchMe().then((me) => {
      if (!me) return;
      setUser(me);
      setName(me.name ?? '');
    });
  }, []);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setProfileLoading(true);
    try {
      const updated = await updateProfile({ name });
      setUser(updated);
      setName(updated.name ?? '');
      setProfileMsg('资料已保存');
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : '保存失败');
    } finally {
      setProfileLoading(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      clearTokens();
      setPasswordMsg('密码已更新，请重新登录');
      setTimeout(() => router.replace('/login'), 800);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : '修改失败');
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">加载个人资料…</p>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <PageHeader
        title="设置"
        description="维护个人资料与登录密码。"
      />

      <Card className="gap-0 border-border/80 py-0 shadow-none">
        <CardHeader className="space-y-1 px-5 py-4">
          <CardTitle className="font-[family-name:var(--font-display)]">
            个人资料
          </CardTitle>
          <CardDescription>邮箱不可改；可更新显示名称</CardDescription>
        </CardHeader>
        <form onSubmit={onSaveProfile}>
          <CardContent className="flex flex-col gap-4 px-5 pb-5 pt-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" value={user.email} disabled />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">显示名称</Label>
              <Input
                id="name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
              />
            </div>
            {profileError ? (
              <p className="text-sm text-destructive">{profileError}</p>
            ) : null}
            {profileMsg ? (
              <p className="text-sm text-muted-foreground">{profileMsg}</p>
            ) : null}
          </CardContent>
          <CardFooter className="border-t border-border/50 px-5 py-4">
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? '保存中…' : '保存资料'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="gap-0 border-border/80 py-0 shadow-none">
        <CardHeader className="space-y-1 px-5 py-4">
          <CardTitle className="font-[family-name:var(--font-display)]">
            修改密码
          </CardTitle>
          <CardDescription>修改成功后需重新登录</CardDescription>
        </CardHeader>
        <form onSubmit={onChangePassword}>
          <CardContent className="flex flex-col gap-4 px-5 pb-5 pt-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
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
            {passwordError ? (
              <p className="text-sm text-destructive">{passwordError}</p>
            ) : null}
            {passwordMsg ? (
              <p className="text-sm text-muted-foreground">{passwordMsg}</p>
            ) : null}
          </CardContent>
          <CardFooter className="border-t border-border/50 px-5 py-4">
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? '提交中…' : '更新密码'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
