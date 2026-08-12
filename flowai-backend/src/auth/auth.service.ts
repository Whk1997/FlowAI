import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type PublicUser = {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
};

type MemoryResetToken = {
  userId: number;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resetTtlSeconds = 60 * 60;
  /** 无 Redis 时的进程内重置令牌（重启失效） */
  private readonly memoryResetByHash = new Map<string, MemoryResetToken>();
  private readonly memoryResetByUser = new Map<number, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password,
        name: dto.name?.trim() || null,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email, user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    // 热路径：Redis 命中后仍以 Postgres 删除结果为准（防缓存与登出不同步）
    const cached = await this.readRefreshCache(tokenHash);
    if (cached) {
      const removed = await this.prisma.refreshToken.deleteMany({
        where: { tokenHash },
      });
      await this.dropRefreshCache(tokenHash, cached.userId);
      if (removed.count === 0) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      const publicUser = {
        id: cached.userId,
        email: cached.email,
        name: cached.name,
        createdAt: cached.createdAt,
      };
      const tokens = await this.issueTokens(
        cached.userId,
        cached.email,
        publicUser,
      );
      return { user: publicUser, ...tokens };
    }

    // 冷路径：Redis 未命中 → Postgres 真源
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    await this.dropRefreshCache(tokenHash, stored.userId);
    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user,
    );
    return { user: this.toPublicUser(stored.user), ...tokens };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const cached = await this.readRefreshCache(tokenHash);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    if (cached) {
      await this.dropRefreshCache(tokenHash, cached.userId);
    } else {
      // 无缓存时也尽量删 key，避免孤儿缓存
      await this.dropRefreshCacheKey(tokenHash);
    }
    return { success: true };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toPublicUser(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const name = dto.name === undefined ? undefined : dto.name.trim() || null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
      },
    });
    return this.toPublicUser(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
    await this.revokeAllRefreshForUser(userId);
    await this.revokePasswordResetForUser(userId);

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = {
      message:
        'If an account exists for this email, a password reset token has been issued.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      return generic;
    }

    const rawToken = randomBytes(32).toString('hex');
    await this.storePasswordResetToken(user.id, rawToken);

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:3000';
    const resetPath = `/reset-password?token=${rawToken}`;
    this.logger.log(
      `Password reset issued for user ${user.id}: ${frontendUrl}${resetPath}`,
    );

    if (!this.shouldReturnResetToken()) {
      return generic;
    }

    return {
      ...generic,
      resetToken: rawToken,
      resetPath,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const userId = await this.consumePasswordResetToken(tokenHash);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);
    await this.revokeAllRefreshForUser(userId);

    return { success: true };
  }

  private resetTokenKey(tokenHash: string) {
    return `flowai:auth:reset:${tokenHash}`;
  }

  private resetUserKey(userId: number) {
    return `flowai:auth:reset:user:${userId}`;
  }

  private async storePasswordResetToken(userId: number, rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.revokePasswordResetForUser(userId);

    if (this.redis.isConfigured()) {
      try {
        await this.redis.setex(
          this.resetTokenKey(tokenHash),
          this.resetTtlSeconds,
          String(userId),
        );
        await this.redis.setex(
          this.resetUserKey(userId),
          this.resetTtlSeconds,
          tokenHash,
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Redis password-reset store failed, using memory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.memoryResetByHash.set(tokenHash, {
      userId,
      expiresAt: Date.now() + this.resetTtlSeconds * 1000,
    });
    this.memoryResetByUser.set(userId, tokenHash);
  }

  private async consumePasswordResetToken(
    tokenHash: string,
  ): Promise<number | null> {
    if (this.redis.isConfigured()) {
      try {
        const rawUserId = await this.redis.getdel(
          this.resetTokenKey(tokenHash),
        );
        if (!rawUserId) {
          return null;
        }
        const userId = Number(rawUserId);
        if (!Number.isFinite(userId)) {
          return null;
        }
        await this.redis.del(this.resetUserKey(userId));
        return userId;
      } catch (error) {
        this.logger.warn(
          `Redis password-reset consume failed, trying memory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const stored = this.memoryResetByHash.get(tokenHash);
    if (!stored || stored.expiresAt <= Date.now()) {
      this.memoryResetByHash.delete(tokenHash);
      return null;
    }
    this.memoryResetByHash.delete(tokenHash);
    if (this.memoryResetByUser.get(stored.userId) === tokenHash) {
      this.memoryResetByUser.delete(stored.userId);
    }
    return stored.userId;
  }

  private async revokePasswordResetForUser(userId: number) {
    if (this.redis.isConfigured()) {
      try {
        const tokenHash = await this.redis.get(this.resetUserKey(userId));
        const keys = [this.resetUserKey(userId)];
        if (tokenHash) {
          keys.push(this.resetTokenKey(tokenHash));
        }
        await this.redis.del(...keys);
        return;
      } catch (error) {
        this.logger.warn(
          `Redis password-reset revoke failed, clearing memory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const tokenHash = this.memoryResetByUser.get(userId);
    if (tokenHash) {
      this.memoryResetByHash.delete(tokenHash);
      this.memoryResetByUser.delete(userId);
    }
  }

  private shouldReturnResetToken() {
    const flag = this.config.get<string>('PASSWORD_RESET_RETURN_TOKEN');
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return this.config.get<string>('NODE_ENV') !== 'production';
  }

  private async issueTokens(
    userId: number,
    email: string,
    profile: {
      name: string | null;
      createdAt: Date;
    },
  ): Promise<AuthTokens> {
    const accessExpires =
      this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpires as `${number}m`,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = this.parseDurationDays(
      this.config.get<string>('JWT_REFRESH_EXPIRES', '7d'),
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);
    const tokenHash = this.hashToken(refreshToken);

    // Postgres 为真源；Redis 为热路径缓存
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    await this.cacheRefreshToken(tokenHash, {
      userId,
      email,
      name: profile.name,
      createdAt: profile.createdAt,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private refreshTokenKey(tokenHash: string) {
    return `flowai:auth:refresh:${tokenHash}`;
  }

  private refreshUserKey(userId: number) {
    return `flowai:auth:refresh:user:${userId}`;
  }

  private async cacheRefreshToken(
    tokenHash: string,
    session: {
      userId: number;
      email: string;
      name: string | null;
      createdAt: Date;
      expiresAt: Date;
    },
  ) {
    if (!this.redis.isConfigured()) return;

    const ttlSeconds = Math.max(
      60,
      Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
    );
    const payload = JSON.stringify({
      userId: session.userId,
      email: session.email,
      name: session.name,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    });

    try {
      await this.redis.setex(
        this.refreshTokenKey(tokenHash),
        ttlSeconds,
        payload,
      );
      await this.redis.sadd(this.refreshUserKey(session.userId), tokenHash);
      await this.redis.expire(this.refreshUserKey(session.userId), ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Redis refresh cache write failed (DB still authoritative): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async readRefreshCache(tokenHash: string): Promise<{
    userId: number;
    email: string;
    name: string | null;
    createdAt: Date;
  } | null> {
    if (!this.redis.isConfigured()) return null;

    try {
      const raw = await this.redis.get(this.refreshTokenKey(tokenHash));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as {
        userId?: unknown;
        email?: unknown;
        name?: unknown;
        createdAt?: unknown;
        expiresAt?: unknown;
      };
      const userId = Number(parsed.userId);
      if (!Number.isFinite(userId) || typeof parsed.email !== 'string') {
        return null;
      }
      if (
        typeof parsed.expiresAt === 'string' &&
        new Date(parsed.expiresAt) < new Date()
      ) {
        await this.dropRefreshCache(tokenHash, userId);
        return null;
      }

      return {
        userId,
        email: parsed.email,
        name: typeof parsed.name === 'string' ? parsed.name : null,
        createdAt:
          typeof parsed.createdAt === 'string'
            ? new Date(parsed.createdAt)
            : new Date(),
      };
    } catch (error) {
      this.logger.warn(
        `Redis refresh cache read failed, falling back to DB: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async dropRefreshCacheKey(tokenHash: string) {
    if (!this.redis.isConfigured()) return;
    try {
      await this.redis.del(this.refreshTokenKey(tokenHash));
    } catch (error) {
      this.logger.warn(
        `Redis refresh key drop failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async dropRefreshCache(tokenHash: string, userId: number) {
    if (!this.redis.isConfigured()) return;
    try {
      await this.redis.del(this.refreshTokenKey(tokenHash));
      await this.redis.srem(this.refreshUserKey(userId), tokenHash);
    } catch (error) {
      this.logger.warn(
        `Redis refresh cache drop failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async revokeAllRefreshForUser(userId: number) {
    if (!this.redis.isConfigured()) return;

    try {
      const hashes = await this.redis.smembers(this.refreshUserKey(userId));
      const keys = hashes.map((hash) => this.refreshTokenKey(hash));
      keys.push(this.refreshUserKey(userId));
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.warn(
        `Redis refresh revoke-all failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationDays(value: string): number {
    const match = /^(\d+)d$/i.exec(value.trim());
    return match ? Number(match[1]) : 7;
  }

  private toPublicUser(user: {
    id: number;
    email: string;
    name: string | null;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
