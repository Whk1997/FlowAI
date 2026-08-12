import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { RedisService } from '../redis/redis.service';

type RateBucket = {
  count: number;
  /** UTC 日历日 YYYY-MM-DD，与 Redis key 对齐 */
  day: string;
};

export type TaskBreakdownSuggestion = {
  title: string;
  description: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly dailyLimit: number;
  /** REDIS_URL 未配置或 Redis 暂不可用时的进程内回退 */
  private readonly memoryBuckets = new Map<number, RateBucket>();

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const apiKey =
      this.config.get<string>('ANTHROPIC_API_KEY')?.trim() ||
      this.config.get<string>('OPENAI_API_KEY')?.trim();

    const baseURL =
      this.config.get<string>('ANTHROPIC_BASE_URL')?.trim() ||
      this.config.get<string>('OPENAI_BASE_URL')?.trim() ||
      undefined;

    this.model =
      this.config.get<string>('ANTHROPIC_MODEL')?.trim() ||
      this.config.get<string>('OPENAI_MODEL')?.trim() ||
      'gpt-5.4';

    const proxyUrl =
      this.config.get<string>('AI_HTTP_PROXY')?.trim() ||
      this.config.get<string>('HTTPS_PROXY')?.trim() ||
      this.config.get<string>('HTTP_PROXY')?.trim() ||
      process.env.https_proxy?.trim() ||
      process.env.http_proxy?.trim();

    const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          ...(baseURL ? { baseURL } : {}),
          timeout: 120_000,
          ...(proxyAgent
            ? {
                fetch: ((url: RequestInfo | URL, init?: RequestInit) =>
                  undiciFetch(url as string | URL, {
                    ...(init as object),
                    dispatcher: proxyAgent,
                  })) as unknown as typeof fetch,
              }
            : {}),
        })
      : null;

    this.dailyLimit = Number(this.config.get<string>('AI_DAILY_LIMIT', '30'));
  }

  isConfigured() {
    return Boolean(this.client);
  }

  private assertConfigured() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI API key is not configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)',
      );
    }
    return this.client;
  }

  private utcDayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  private rateLimitKey(userId: number, day = this.utcDayKey()) {
    return `flowai:ai:daily:${userId}:${day}`;
  }

  /** 距离下一个 UTC 零点的秒数（至少 60s，便于 EXPIRE） */
  private secondsUntilNextUtcMidnight(now = new Date()) {
    const next = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    );
    return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
  }

  private async assertUnderDailyLimit(userId: number) {
    const day = this.utcDayKey();

    if (this.redis.isConfigured()) {
      try {
        const raw = await this.redis.get(this.rateLimitKey(userId, day));
        const count = raw ? Number(raw) : 0;
        if (Number.isFinite(count) && count >= this.dailyLimit) {
          throw new BadRequestException(
            `AI daily limit reached (${this.dailyLimit}/day)`,
          );
        }
        return;
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.warn(
          `Redis rate check failed, falling back to memory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const bucket = this.memoryBuckets.get(userId);
    if (!bucket || bucket.day !== day) {
      this.memoryBuckets.set(userId, { count: 0, day });
      return;
    }
    if (bucket.count >= this.dailyLimit) {
      throw new BadRequestException(
        `AI daily limit reached (${this.dailyLimit}/day)`,
      );
    }
  }

  private async recordDailyUsage(userId: number) {
    const day = this.utcDayKey();

    if (this.redis.isConfigured()) {
      try {
        const key = this.rateLimitKey(userId, day);
        const count = await this.redis.incr(key);
        if (count === 1) {
          await this.redis.expire(key, this.secondsUntilNextUtcMidnight());
        }
        return;
      } catch (error) {
        this.logger.warn(
          `Redis rate record failed, falling back to memory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const bucket = this.memoryBuckets.get(userId);
    if (!bucket || bucket.day !== day) {
      this.memoryBuckets.set(userId, { count: 1, day });
      return;
    }
    bucket.count += 1;
  }

  async summarizeNote(params: {
    userId: number;
    title: string;
    content: string;
  }) {
    const client = this.assertConfigured();
    const content = params.content.trim();
    if (!content) {
      throw new BadRequestException('Note content is empty');
    }

    await this.assertUnderDailyLimit(params.userId);
    const truncated = this.truncate(content, 12000);

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        max_completion_tokens: 1024,
        messages: this.summaryMessages(params.title, truncated),
      });

      const summary = completion.choices[0]?.message?.content?.trim() ?? '';
      if (!summary) {
        throw new ServiceUnavailableException(
          'Empty response from AI provider',
        );
      }

      await this.recordDailyUsage(params.userId);

      return {
        summary,
        model: this.model,
        usage: this.toUsage(completion.usage),
      };
    } catch (error) {
      this.rethrowAiError(error);
    }
  }

  async *summarizeNoteStream(params: {
    userId: number;
    title: string;
    content: string;
  }): AsyncGenerator<
    | { type: 'delta'; text: string }
    | {
        type: 'done';
        summary: string;
        model: string;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        } | null;
      }
  > {
    const client = this.assertConfigured();
    const content = params.content.trim();
    if (!content) {
      throw new BadRequestException('Note content is empty');
    }

    await this.assertUnderDailyLimit(params.userId);
    const truncated = this.truncate(content, 12000);

    try {
      const stream = await client.chat.completions.create({
        model: this.model,
        max_completion_tokens: 1024,
        stream: true,
        messages: this.summaryMessages(params.title, truncated),
      });

      let summary = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          summary += delta;
          yield { type: 'delta', text: delta };
        }
      }

      if (!summary.trim()) {
        throw new ServiceUnavailableException(
          'Empty response from AI provider',
        );
      }

      await this.recordDailyUsage(params.userId);
      yield {
        type: 'done',
        summary: summary.trim(),
        model: this.model,
        usage: null,
      };
    } catch (error) {
      this.rethrowAiError(error);
    }
  }

  async breakdownTask(params: {
    userId: number;
    title: string;
    description: string | null;
  }) {
    const client = this.assertConfigured();
    await this.assertUnderDailyLimit(params.userId);
    const description = (params.description ?? '').trim();

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        max_completion_tokens: 1024,
        messages: [
          {
            role: 'system',
            content:
              '你是个人任务管理助手。根据用户任务拆成可执行的子步骤。只输出 JSON（不要 Markdown 代码块），格式：{"suggestions":[{"title":"简短标题","description":"一句说明"}]}。suggestions 3-6 条；title 不超过 40 字；不要编造与任务无关的事项。',
          },
          {
            role: 'user',
            content: `任务标题：${params.title}\n任务描述：${description || '（无）'}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';
      const suggestions = this.parseBreakdownSuggestions(raw);
      if (suggestions.length === 0) {
        throw new ServiceUnavailableException(
          'AI returned no usable breakdown suggestions',
        );
      }

      await this.recordDailyUsage(params.userId);

      return {
        suggestions,
        model: this.model,
        usage: this.toUsage(completion.usage),
        raw,
      };
    } catch (error) {
      this.rethrowAiError(error);
    }
  }

  private summaryMessages(title: string, content: string) {
    return [
      {
        role: 'system' as const,
        content:
          '你是个人知识管理助手。请用简洁中文总结笔记，输出：\n1) 一句话概述\n2) 3-6 条要点\n3) 可选的待办/后续行动（若无明显行动可省略）\n不要编造原文没有的信息。',
      },
      {
        role: 'user' as const,
        content: `标题：${title}\n\n正文：\n${content}`,
      },
    ];
  }

  private parseBreakdownSuggestions(raw: string): TaskBreakdownSuggestion[] {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as {
        suggestions?: Array<{ title?: unknown; description?: unknown }>;
      };
      if (!Array.isArray(parsed.suggestions)) return [];

      return parsed.suggestions
        .map((item) => ({
          title:
            typeof item.title === 'string'
              ? item.title.trim().slice(0, 80)
              : '',
          description:
            typeof item.description === 'string'
              ? item.description.trim().slice(0, 500)
              : '',
        }))
        .filter((item) => item.title.length > 0)
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  private truncate(content: string, max: number) {
    return content.length > max
      ? `${content.slice(0, max)}\n\n…(truncated)`
      : content;
  }

  private toUsage(
    usage?: {
      prompt_tokens?: number | null;
      completion_tokens?: number | null;
      total_tokens?: number | null;
    } | null,
  ) {
    if (!usage) return null;
    return {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    };
  }

  private rethrowAiError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ServiceUnavailableException
    ) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'AI request failed';
    throw new ServiceUnavailableException(message);
  }
}
