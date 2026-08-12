# NestJS API — 适用于 Zeabur / Railway / Render / 本地 Docker 部署
# ---------- 阶段 1：安装依赖（deps）----------
FROM node:22-alpine AS deps
# 基于 Node 22 Alpine 轻量镜像，命名为 deps 阶段
WORKDIR /app
# 容器内工作目录设为 /app
RUN apk add --no-cache openssl libc6-compat
# 安装 Prisma 所需的 openssl，以及 Alpine 兼容库（不缓存 apk 索引以减小体积）
COPY package.json package-lock.json ./
# 只复制依赖清单，便于利用 Docker 层缓存
COPY prisma ./prisma
# 复制 Prisma schema，供后续 prisma generate 使用
RUN npm ci
# 按 lockfile 精确安装全部依赖（含 devDependencies，供构建用）

# ---------- 阶段 2：编译 TypeScript（build）----------
FROM deps AS build
# 继承 deps 阶段已装好的依赖，命名为 build 阶段
COPY . .
# 复制后端源码与配置到镜像
RUN npm run build
# 执行 nest build，输出到 dist/

# ---------- 阶段 3：生产运行镜像（runner）----------
FROM node:22-alpine AS runner
# 全新轻量镜像，只放运行时需要的文件
WORKDIR /app
# 生产容器工作目录
RUN apk add --no-cache openssl libc6-compat
# 运行时同样需要 openssl（Prisma）与兼容库
ENV NODE_ENV=production
# 标记生产环境，影响 Nest/依赖行为
COPY package.json package-lock.json ./
# 复制依赖清单，准备安装生产依赖
COPY prisma ./prisma
# 复制 schema，用于生成 Prisma Client
RUN npm ci --omit=dev && npx prisma generate
# 只装生产依赖，并生成 Prisma Client
COPY --from=build /app/dist ./dist
# 从 build 阶段拷贝编译产物，避免带入源码与 dev 依赖

EXPOSE 3001
# 声明容器监听端口（与 Nest 默认/配置一致）
CMD ["npm", "run", "start:prod:migrate"]
# 启动前跑迁移，再以生产模式启动 Nest
