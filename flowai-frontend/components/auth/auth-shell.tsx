import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthShellProps = {
  children: ReactNode;
  /** 品牌下方一句说明 */
  tagline?: string;
};

/**
 * 登录/注册等鉴权页共用壳：全出血氛围底 + 品牌主导 + 交互表单区。
 */
export function AuthShell({
  children,
  tagline = '把任务、笔记与 AI 收进同一条个人工作流',
}: AuthShellProps) {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden text-[oklch(0.97_0.01_95)]">
      {/* 氛围底：墨青渐变 + 细网格，避免纯色/紫调 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_10%,oklch(0.42_0.08_195/_0.55),transparent_55%),radial-gradient(90%_70%_at_90%_80%,oklch(0.55_0.12_75/_0.28),transparent_50%),linear-gradient(165deg,oklch(0.22_0.035_220),oklch(0.28_0.045_200)_45%,oklch(0.2_0.03_230))]"
      />
      <div
        aria-hidden
        className="auth-grid pointer-events-none absolute inset-0 opacity-[0.22]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.14_85/_0.12)] blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12 md:flex-row md:items-center md:gap-16 md:px-10 lg:gap-24">
        <header className="auth-enter max-w-md md:flex-1">
          <Link
            href="/login"
            className="font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight text-[oklch(0.98_0.01_95)] md:text-6xl lg:text-7xl"
          >
            FlowAI
          </Link>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-[oklch(0.9_0.02_95/_0.78)] md:text-lg">
            {tagline}
          </p>
          <p className="mt-6 hidden text-sm text-[oklch(0.88_0.02_95/_0.45)] md:block">
            看板 · Markdown · 附件 · AI 总结与拆解
          </p>
        </header>

        <div className="auth-enter-delay w-full max-w-md md:flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
