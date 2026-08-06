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

**本版不做**：团队协作、实时通知、分享链接、密码重置、标签/评论（Stretch 可后续补）。

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
3. `/notes` 搜索 / 新建笔记 → 编辑保存
4. 笔记详情：上传附件 → 下载 / 删除
5. 「生成总结」（需配置 AI 密钥；本机若走代理需 `AI_HTTP_PROXY`）

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
| `AI_DAILY_LIMIT` | 每用户每日 AI 次数，默认 `30` |

未配置 Supabase 时，附件保存在后端 `uploads/`。

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
- 环境变量：`NEXT_PUBLIC_API_URL=https://你的后端域名/api`（**后端上线后再改**，改完需 Redeploy）

### 后端：Zeabur（推荐）

仓库含 `flowai-backend/Dockerfile`：镜像启动时会先 `prisma migrate deploy` 再起 Nest。

1. 打开 [Zeabur](https://zeabur.com) → New Project → Deploy from GitHub → 选 `Whk1997/FlowAI`
2. 添加服务后设置：
   - **Root Directory** = `flowai-backend`（必填，否则会扫到 monorepo 根目录）
   - 有 `Dockerfile` 时 Zeabur 会自动用 Docker 构建
3. Variables 填入（生产）：

| 变量 | 值 |
|------|-----|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://flow-ai-dusky-five.vercel.app` |
| `DATABASE_URL` | Supabase Transaction pooler（6543 + `pgbouncer=true`） |
| `DIRECT_URL` | Supabase Session / Direct（5432） |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 强随机串 |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | `15m` / `7d` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | 建议必配（附件） |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` | AI 总结 |
| `AI_DAILY_LIMIT` | 如 `30` |

**不要**设置 `AI_HTTP_PROXY`。`PORT` 一般由平台注入（本服务监听 `0.0.0.0`）。

4. Deploy 成功后打开公网域名 + `/api/health`，应返回 JSON。
5. 回到 Vercel，设置 `NEXT_PUBLIC_API_URL=https://<zeabur域名>/api` 并 Redeploy。
6. 可选：在 Zeabur Shell 执行 `npm run prisma:seed` 写入演示账号。

演示账号：`demo@flowai.dev` / `demo123456`

### 备选平台

Railway / Render 同样：Root = `flowai-backend`，Start = `npm run start:prod:migrate`，环境变量同上。
