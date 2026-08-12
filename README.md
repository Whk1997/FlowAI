# FlowAI

AI 驱动的个人工作流与知识管理平台（简历级个人 MVP，一周交付）。

## 仓库结构

```
FlowAI/
├── FlowAI_PRD.md          # 产品需求
├── flowai-backend/        # NestJS API
└── flowai-frontend/       # Next.js App Router
```

## 架构

```
浏览器 → Next.js（仅 UI）
           │
           ▼
        NestJS API  ←── JWT Access + Refresh
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
  Prisma  Supabase       AI 中转
  (Postgres) Storage   (OpenAI 兼容)
```

硬约束：浏览器只请求 NestJS；业务数据按 `userId` 隔离；AI 密钥仅后端。

## 已完成（Day 1–6）

| Day | 内容 |
|-----|------|
| 1 | 鉴权（注册/登录/刷新/登出） |
| 2 | 任务看板 CRUD + 状态流转 |
| 3 | Markdown 笔记 + 收藏/归档 |
| 4 | 笔记附件上传/下载/删除 |
| 5 | 笔记 AI 总结 |
| 6 | 越权复查、CORS 加固、笔记搜索、演示账号、README |
| 7 | 生产部署（Vercel + 自建/轻量服务器） |
| Stretch | 个人资料/密码重置；任务标签与评论；笔记搜索增强；任务 AI 拆解与采纳；笔记 AI SSE；Swagger；GitHub Actions CI |

**本版不做**：团队协作、实时通知、分享链接（其余 Stretch 可后续补）。

## 演示账号

```bash
cd flowai-backend
npm run prisma:seed
```

| 字段 | 值 |
|------|-----|
| 邮箱 | `demo@flowai.dev` |
| 密码 | `demo123456` |

登录后可见示例任务与笔记。

## 本地启动

### 1. 后端

```bash
cd flowai-backend
cp .env.example .env   # 若尚无 .env
npx prisma migrate dev
npm run prisma:seed    # 可选：写入演示账号
npm run start:dev
```

- API：`http://localhost:3001/api`
- 健康检查：`GET /api/health`
- Swagger：`http://localhost:3001/api/docs`（开发默认开启；生产需 `SWAGGER_ENABLED=true`）

### 2. 前端

```bash
cd flowai-frontend
cp .env.example .env.local
npm run dev
```

打开：`http://localhost:3000`

### 3. 验收路径

1. 用演示账号登录 → `/dashboard`
2. `/tasks` 新建任务并改状态
3. `/notes` 搜索（防抖 + 高亮）/ 列表收藏与归档 / 新建笔记
4. 笔记详情：上传附件 → 下载 / 删除
5. 笔记「生成总结」（SSE 流式；需 AI 密钥；本机代理设 `AI_HTTP_PROXY`）
6. 任务详情「生成拆解」→ 勾选 →「采纳并创建任务」
7. `/settings` 改显示名 / 改密码；或登录页「忘记密码」走重置（未接邮箱时开发环境会返回重置链接；生产演示可设 `PASSWORD_RESET_RETURN_TOKEN=true`）

## 环境变量

### 后端 `flowai-backend/.env`

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Supabase Postgres（建议 pooler `6543` + `pgbouncer=true`） |
| `DIRECT_URL` | 迁移用直连 / Session pooler（`5432`） |
| `JWT_ACCESS_SECRET` | Access Token 密钥 |
| `JWT_REFRESH_SECRET` | 预留（当前 refresh 为随机串 + DB 哈希） |
| `PORT` | 默认 `3001` |
| `CORS_ORIGIN` | 前端源；**生产必填**，如 `https://xxx.vercel.app` |
| `NODE_ENV` | 生产设为 `production`（未设 `CORS_ORIGIN` 会启动失败） |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | 可选；配置后附件走 Supabase Storage |
| `ANTHROPIC_API_KEY` | AI 中转密钥 |
| `ANTHROPIC_BASE_URL` | 如 `https://apinebula.com/v1` |
| `ANTHROPIC_MODEL` | 如 `gpt-5.4` |
| `AI_HTTP_PROXY` | 本地代理，如 `http://127.0.0.1:7890`（Node 不走系统代理） |
| `AI_DAILY_LIMIT` | 每用户每日 AI 次数，默认 `30`（UTC 自然日） |
| `REDIS_URL` | 可选；如 `redis://127.0.0.1:6379`。用于 AI 日限额、密码重置令牌，以及 Refresh Token 热缓存（Postgres 仍为真源）；未配置则回退 |
| `SWAGGER_ENABLED` | `true` 强制开启文档；生产默认关，开发默认开 |

未配置 Supabase 时，附件保存在后端 `uploads/`。

## Swagger

本地启动后端后打开 `/api/docs`。受保护接口点 **Authorize**，填入登录后的 Access Token（`Bearer` 前缀可不写，UI 会加）。

## CI（GitHub Actions）

推送到 `main` 或向 `main` 开 PR 时运行 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)：

| Job | 内容 |
|-----|------|
| Backend | `npm ci` → `prisma generate` → `build` → `lint:ci` |
| Frontend | `npm ci` → `typecheck` → `lint` → `build` |

本地等价检查：

```bash
# 后端
cd flowai-backend && npm ci && npx prisma generate && npm run build && npm run lint:ci

# 前端
cd flowai-frontend && npm ci && npm run typecheck && npm run lint && npm run build
```

### 前端 `flowai-frontend/.env.local`

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 默认 `http://localhost:3001/api` |

## UI 约定

- 页面组装优先 shadcn/ui
- 没有现成组件用 Tailwind
- 禁止对 shadcn 已有组件做无意义再封装

## 生产部署（Day 7）

### 前端（已部署）

- 平台：Vercel，Root Directory = `flowai-frontend`
- 环境变量：`NEXT_PUBLIC_API_URL=https://<后端公网HTTPS>/api`（改完需 Redeploy）

### 后端：Zeabur（推荐）

仓库已有 `flowai-backend/Dockerfile`（启动命令含 `prisma migrate deploy`）。无需本机构建镜像。

#### 1. 部署服务

1. [Zeabur](https://zeabur.com) 登录 → New Project → Deploy New Service → **Git**（连本仓库）
2. Root Directory 选 **`flowai-backend`**
3. 构建方式选 **Dockerfile**（自动识别即可）
4. 部署完成后记下公网域名，形如 `https://xxx.zeabur.app`

#### 2. 环境变量（Variables）

在服务 Variables 里按表填写；**不要**设 `AI_HTTP_PROXY`。`PORT` 一般由 Zeabur 注入，可不手写。

| 变量 | 值 |
|------|-----|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://flow-ai-dusky-five.vercel.app` |
| `DATABASE_URL` | Supabase pooler `6543` + `pgbouncer=true` |
| `DIRECT_URL` | Supabase `5432` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 强随机串 |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | `15m` / `7d` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | 建议必配 |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` | AI |
| `AI_DAILY_LIMIT` | `30` |
| `REDIS_URL` | 可选；AI 日限额与密码重置令牌 |

改变量后若未自动重启，在控制台 Restart 一次。

#### 3. 验收

- 健康检查：`https://<你的-zeabur-域名>/api/health`
- Vercel 环境变量：`NEXT_PUBLIC_API_URL=https://<你的-zeabur-域名>/api` → Redeploy
- 可选 seed（Zeabur 终端 / one-off）：`npm run prisma:seed`  
  演示账号：`demo@flowai.dev` / `demo123456`

### 备选：阿里云轻量 + Docker

0.5G 机器勿在服务器 `npm run build`；本机 OrbStack/Docker 构建 `linux/amd64` 镜像后 `scp` + `docker load`。配置见仓库 `flowai-backend/docker-compose.yml`、`Caddyfile`；无域名可用 `https://<公网IP>.sslip.io`。详细步骤可按需再展开。
