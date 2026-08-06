import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

type RateBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AiService {
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly dailyLimit: number;
  private readonly rateBuckets = new Map<number, RateBucket>();

  constructor(private readonly config: ConfigService) {
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
          // macOS 系统代理对 Node undici 不生效，需显式走本地代理
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

  private assertRateLimit(userId: number) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const bucket = this.rateBuckets.get(userId);

    if (!bucket || bucket.resetAt <= now) {
      this.rateBuckets.set(userId, { count: 0, resetAt: now + dayMs });
      return this.rateBuckets.get(userId)!;
    }

    if (bucket.count >= this.dailyLimit) {
      throw new BadRequestException(
        `AI daily limit reached (${this.dailyLimit}/day)`,
      );
    }

    return bucket;
  }

  async summarizeNote(params: {
    userId: number;
    title: string;
    content: string;
  }) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI API key is not configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)',
      );
    }

    const content = params.content.trim();
    if (!content) {
      throw new BadRequestException('Note content is empty');
    }

    const bucket = this.assertRateLimit(params.userId);

    const truncated =
      content.length > 12000 ? `${content.slice(0, 12000)}\n\n…(truncated)` : content;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: 1024,
        messages: [
          {
            role: 'system',
            content:
              '你是个人知识管理助手。请用简洁中文总结笔记，输出：\n1) 一句话概述\n2) 3-6 条要点\n3) 可选的待办/后续行动（若无明显行动可省略）\n不要编造原文没有的信息。',
          },
          {
            role: 'user',
            content: `标题：${params.title}\n\n正文：\n${truncated}`,
          },
        ],
      });

      const summary = completion.choices[0]?.message?.content?.trim() ?? '';
      if (!summary) {
        throw new ServiceUnavailableException('Empty response from AI provider');
      }

      bucket.count += 1;

      return {
        summary,
        model: this.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
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
}
