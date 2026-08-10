# FlowAI PRD — v1 个人 MVP

## 1. 项目概述

### 1.1 项目名称

**FlowAI — AI 驱动的个人工作流与知识管理平台**

### 1.2 一句话描述

面向个人的工作流工具：任务看板 + Markdown 笔记 + 文件附件 + 笔记 AI 总结，帮助用户整理待办并沉淀知识。

### 1.3 版本边界（v1 · 一周交付）


| 必达（Must）              | 有余力（Stretch）              | 明确不做            |
| --------------------- | ------------------------- | --------------- |
| 邮箱注册/登录/登出、JWT        | 密码重置、个人资料编辑               | 团队空间、协作编辑       |
| 任务看板 CRUD + 状态流转      | 任务评论、标签                   | 实时 WebSocket 通知 |
| Markdown 笔记 CRUD + 预览 | 收藏、归档、全文搜索                | 会议纪要、智能标签       |
| 笔记附件上传/删除             | 任务 AI 拆解建议                | 分享链接、游客角色       |
| 笔记 AI 总结（可先非流式）       | AI 流式输出、日限额细化             | 操作审计、计费         |
| 生产可访问 URL + README    | Swagger、GitHub Actions CI | —               |


> 一周原则：先打通「注册 → 任务 → 笔记 → 附件 → AI 总结 → 上线」主路径；Stretch 全部可砍，不影响验收。

### 1.4 项目目标

- **业务目标**：解决个人场景下信息碎片化、任务跟进低效、知识难沉淀的问题。
- **技术目标**：展示全栈能力（Next.js + NestJS + Prisma + Supabase + JWT + AI）。
- **面试目标**：证明具备上线思维、系统设计和范围取舍能力。

---



## 2. 用户角色


| 角色    | 说明                     |
| ----- | ---------------------- |
| 未登录用户 | 仅可访问登录/注册页；无法使用核心功能    |
| 注册用户  | 完整使用个人工作流（任务、笔记、文件、AI） |


> v1 不做游客、团队成员、团队管理员。

---



## 3. 功能模块



### 3.1 认证与用户系统

**Must**：

- 邮箱 + 密码注册 / 登录
- JWT 鉴权（Access Token + Refresh Token）
- 登出（刷新令牌失效）

**Stretch**：

- 个人资料编辑（昵称）
- 密码重置（邮箱重置链接 / token）

**技术要点**：

- NestJS Auth Module + Passport JWT
- bcrypt 密码哈希
- Refresh Token 存库（支持真正登出）
- 统一异常与校验（class-validator）



### 3.2 任务管理

**Must**：

- 创建 / 编辑 / 删除任务（标题、描述、优先级、截止日期）
- 看板视图：`TODO` / `IN_PROGRESS` / `DONE`
- 状态流转（点击切换即可，拖拽非必须）

**Stretch**：

- 标签、任务评论
- 按优先级 / 截止日期筛选

**状态机（合法流转）**：

```
TODO ⇄ IN_PROGRESS ⇄ DONE
TODO → DONE（允许直接完成）
DONE → TODO / IN_PROGRESS（允许重开）
```

**技术要点**：

- Prisma：Task（Must）；Comment / Tag / TaskTag（Stretch）
- 标签若做：按用户隔离（`userId` + 用户内唯一）



### 3.3 知识管理

**Must**：

- Markdown 笔记（编辑 + 预览）
- 文件上传并挂到笔记（图片、PDF 等）

**Stretch**：

- 收藏、归档
- 全文搜索（标题 + 内容）

**技术要点**：

- 编辑器：Markdown（如 CodeMirror / Milkdown），不做富文本
- Supabase Storage 存文件；元数据进 Postgres
- 单文件大小上限（建议 10MB）、MIME 白名单
- 搜索若做：PostgreSQL `pg_trgm` 或 `tsvector`



### 3.4 AI 增强

**Must**：

- 笔记自动总结（可先一次性返回，不强制流式）

**Stretch**：

- 流式输出（SSE）
- 任务拆解建议（用户确认后可一键创建子任务）
- 按用户日限额 + 短缓存

**不做**：

- 会议纪要生成、智能标签推荐

**技术要点**：

- OpenAI API（可配置模型）；密钥仅后端
- AI 接口不纳入普通 CRUD 耗时指标

---



## 4. 数据模型设计



### 4.1 核心表结构

```prisma
model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  password     String
  name         String?
  tasks        Task[]
  notes        Note[]
  comments     Comment[]
  tags         Tag[]
  refreshTokens RefreshToken[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model RefreshToken {
  id        Int      @id @default(autoincrement())
  tokenHash String
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model PasswordResetToken {
  id        Int      @id @default(autoincrement())
  tokenHash String   @unique
  userId    Int
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}

model Task {
  id          Int        @id @default(autoincrement())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  userId      Int
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  comments    Comment[]
  tags        TaskTag[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([userId, status])
  @@index([userId, dueDate])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

model Tag {
  id     Int       @id @default(autoincrement())
  name   String
  userId Int
  user   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks  TaskTag[]

  @@unique([userId, name])
}

model TaskTag {
  taskId Int
  tagId  Int
  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([taskId, tagId])
}

model Note {
  id         Int      @id @default(autoincrement())
  title      String
  content    String   @db.Text
  userId     Int
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  files      File[]
  isFavorite Boolean  @default(false)
  isArchived Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId, isArchived])
  @@index([userId, isFavorite])
}

model File {
  id           Int      @id @default(autoincrement())
  name         String
  url          String
  mimeType     String?
  sizeBytes    Int?
  storagePath  String
  noteId       Int
  note         Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())

  @@index([noteId])
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  taskId    Int
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([taskId])
}
```



### 4.2 建模说明

- 所有业务数据按 `userId` 隔离；接口层必须校验资源归属。
- `File` 在 v1 **必须**挂在笔记下（`noteId` 必填）；独立文件库延后。
- 不包含 Team / ShareLink / Notification / AuditLog。

---



## 5. API 设计

> 前缀假设：后端挂载在 `/api`。除注册/登录/刷新/重置密码外，均需 Access Token。  
> 列表接口统一支持：`page`、`pageSize`、以及各资源约定的筛选参数。



### 5.1 认证

- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录（返回 access + refresh）
- `POST /api/auth/refresh` — 刷新 access token
- `POST /api/auth/logout` — 登出（作废 refresh token）
- `GET /api/auth/me` — 当前用户
- `POST /api/auth/password/forgot` — 申请重置
- `POST /api/auth/password/reset` — 凭 token 重置密码



### 5.2 用户

- `PATCH /api/users/me` — 更新个人资料



### 5.3 任务

- `GET /api/tasks` — 列表（`status` / `priority` / `dueBefore` / `tag`）
- `POST /api/tasks` — 创建
- `GET /api/tasks/:id` — 详情（含评论、标签）
- `PATCH /api/tasks/:id` — 更新（含状态流转）
- `DELETE /api/tasks/:id` — 删除
- `POST /api/tasks/:id/comments` — 添加评论
- `POST /api/tasks/:id/breakdown` — AI 任务拆解建议



### 5.4 标签

- `GET /api/tags` — 当前用户标签
- `POST /api/tags` — 创建标签
- `DELETE /api/tags/:id` — 删除标签



### 5.5 笔记

- `GET /api/notes` — 列表（`q` 搜索 / `isFavorite` / `isArchived`）
- `POST /api/notes` — 创建
- `GET /api/notes/:id` — 详情
- `PATCH /api/notes/:id` — 更新（含收藏、归档）
- `DELETE /api/notes/:id` — 删除
- `POST /api/notes/:id/summarize` — AI 总结（流式）



### 5.6 文件

- `POST /api/notes/:noteId/files` — 上传并关联笔记
- `GET /api/files/:id` — 文件元信息
- `DELETE /api/files/:id` — 删除（同步删 Storage）

---



## 6. 前端页面设计



### 6.1 路由

```
/login          — 登录
/register       — 注册
/forgot-password — 申请重置密码
/reset-password  — 重置密码
/dashboard      — 仪表盘（任务概览、最近笔记）
/tasks          — 任务看板
/tasks/:id      — 任务详情
/notes          — 笔记列表
/notes/:id      — 笔记详情（Markdown 编辑 + 预览）
/settings       — 个人设置
```

> 根路径 `/`：未登录跳转 `/login`，已登录跳转 `/dashboard`。  
> v1 不提供独立 `/files`、`/teams` 页；文件在笔记详情内管理。



### 6.2 核心组件

- **AppShell**：侧边栏 + 顶栏
- **TaskBoard**：三列看板
- **NoteEditor**：Markdown 编辑 / 预览
- **FileUploader**：笔记内上传
- **AuthGuard**：登录态路由守卫
- **AiPanel**：总结 / 拆解结果展示（流式）

---



## 7. 技术架构



### 7.1 架构原则

- **浏览器只访问 NestJS**；不直连 Supabase Auth / DB。
- NestJS 使用 Prisma 访问 Supabase Postgres，并用 Supabase Storage SDK 管理文件。
- AI 请求仅由后端发起，密钥不进前端。

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────────┐
│   Next.js   │─────▶│   NestJS    │─────▶│ Supabase Postgres   │
│   Frontend  │◀─────│   Backend   │◀─────│ + Storage           │
└─────────────┘      └──────┬──────┘      └─────────────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  OpenAI API │
                     └─────────────┘
```



### 7.2 技术栈

- **前端**：Next.js（App Router）+ TypeScript + Tailwind CSS + shadcn/ui
- **UI 约定**：页面组装优先用 shadcn/ui；无现成组件时用 Tailwind；禁止对已有 shadcn 组件做无意义再封装
- **后端**：NestJS + TypeScript
- **数据库**：Supabase PostgreSQL
- **ORM**：Prisma
- **鉴权**：JWT Access + Refresh（Passport）
- **文件存储**：Supabase Storage
- **AI**：OpenAI API
- **部署**：Vercel（前端）+ Zeabur（后端）

---



## 8. 非功能性需求



### 8.1 性能

- 首屏（仪表盘）可交互 < 2s（常规网络）
- 普通 CRUD API P95 < 300ms（不含 AI、不含大文件上传）
- AI 接口单独统计；需有加载/流式反馈，不设 200ms 目标



### 8.2 安全

- 密码 bcrypt 存储
- Access Token 短过期；Refresh Token 可吊销
- CORS 白名单
- 全资源鉴权：禁止越权读写他人数据
- 上传：大小限制 + MIME 白名单
- Markdown 渲染防 XSS（消毒或安全渲染器）
- 接口基础限流（尤其 AI 与认证接口）



### 8.3 可维护性

- 按模块划分（auth / tasks / notes / files / ai）
- 统一异常处理与响应格式
- 关键日志
- Swagger（或等效）API 文档

---



## 9. 部署方案



### 9.1 环境

- **开发**：本地 Next.js + NestJS + Supabase 远程库（或本地 Postgres）
- **CI**：GitHub Actions 跑 lint / test
- **生产**：Vercel + Zeabur



### 9.2 环境变量（示例）

```bash
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CORS_ORIGIN=https://your-frontend.vercel.app
```

---



## 10. 里程碑（1 周 · 7 天）

> 假设全职投入；每天有可运行增量。超时优先砍 Stretch，不延期上线。



### Day 1 — 骨架与鉴权

- 初始化 Next.js + NestJS + Prisma + Supabase 连接
- User / RefreshToken schema；注册、登录、刷新、登出
- 前端登录/注册页 + AuthGuard；本地联调通



### Day 2 — 任务看板

- Task CRUD + 状态枚举与归属校验
- 前端 `/tasks` 三列看板（拖拽可简化为点击改状态）
- 仪表盘展示任务概览（可极简）



### Day 3 — 笔记

- Note CRUD；Markdown 编辑 + 预览
- 前端 `/notes`、`/notes/:id` 可用
- （Stretch）收藏 / 归档



### Day 4 — 文件

- Supabase Storage 接通；笔记内上传/删除
- MIME / 大小限制；前端上传组件



### Day 5 — AI

- `POST /notes/:id/summarize`（先同步返回亦可）
- 前端总结入口与结果展示
- （Stretch）流式 SSE；任务拆解建议



### Day 6 — 打磨与补洞

- 越权校验复查、基础错误处理、CORS
- （Stretch）标签 / 评论 / 简单搜索 / 密码重置
- README 初稿、演示账号准备



### Day 7 — 上线验收

- Vercel + Zeabur 部署；环境变量配齐
- 走通验收路径；修阻断级 bug
- README 定稿（架构、启动、演示步骤）



### 每日完成定义（DoD）

当天功能：后端可调通 + 前端可点通 + 数据按用户隔离。  
周末上线最低标准：Must 全部完成，Stretch 完成多少算多少。

---



## 11. 风险与应对


| 风险          | 应对                                                |
| ----------- | ------------------------------------------------- |
| 一周 timelock | 严格 Must / Stretch；Day 5 晚仍未通 AI 则先上线无 AI，Day 7 再补 |
| AI 费用       | 简单限流或手动开关；密钥仅后端                                   |
| 文件存储踩坑      | Day 4 预留整天；不行则先做「外链 URL」占位，标注技术债                  |
| 范围膨胀        | 禁止临时加入团队/分享/通知                                    |
| 部署耗时        | Day 1 先搭空项目部署通；勿堆到 Day 7 才首次发布                    |


---



## 12. 成功指标（v1 · 一周）

**验收必过**：

- 路径可演示：注册 → 建任务并改状态 → 写笔记 → 上传附件 → AI 总结
- 生产可公开访问（前端 URL + 后端健康检查）
- README：架构、本地启动、环境变量、演示步骤

**加分（非必须）**：

- Swagger / 流式 AI / 标签评论搜索 / 密码重置
- 面试能讲清：一周如何取舍、鉴权与数据隔离怎么做

---



## 13. 后续版本（备忘，非承诺）

- v1.1：Stretch 补齐（搜索、标签、评论、密码重置、流式 AI）
- v1.2：分享链接（只读）
- v1.3：站内通知
- v2.0：轻量团队空间与权限

