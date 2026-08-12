import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL not set; AI rate limit, password-reset & refresh cache use DB/memory fallback',
      );
      return;
    }

    const redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.client = redis;
    void redis
      .connect()
      .then(() => this.logger.log('Redis connected'))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis connect failed: ${message}`);
      });
  }

  /** 是否配置了 REDIS_URL（不保证此刻一定已连通） */
  isConfigured() {
    return this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  /** 读取并删除（一次性令牌）；Redis < 6.2 时退化为 GET + DEL */
  async getdel(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.getdel(key);
    } catch {
      const value = await this.client.get(key);
      if (value !== null) {
        await this.client.del(key);
      }
      return value;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.client) {
      throw new Error('Redis is not configured');
    }
    await this.client.setex(key, seconds, value);
  }

  async incr(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis is not configured');
    }
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, seconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    await this.client.del(...keys);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (!this.client || members.length === 0) return;
    await this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (!this.client || members.length === 0) return;
    await this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) return [];
    return this.client.smembers(key);
  }

  async onModuleDestroy() {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
