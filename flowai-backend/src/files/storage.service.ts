import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

export type StoredObject = {
  storagePath: string;
  url: string;
  provider: 'local' | 'supabase';
};

@Injectable()
export class StorageService {
  private readonly uploadRoot: string;
  private readonly supabase: SupabaseClient | null;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadRoot)) {
      mkdirSync(this.uploadRoot, { recursive: true });
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const supabaseKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'note-files');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      this.supabase = null;
    }
  }

  get provider(): 'local' | 'supabase' {
    return this.supabase ? 'supabase' : 'local';
  }

  async upload(params: {
    noteId: number;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<StoredObject> {
    const safeName = params.originalName.replace(/[^\w.\-()\u4e00-\u9fff]+/g, '_');
    const storagePath = `notes/${params.noteId}/${randomUUID()}-${safeName}`;

    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(storagePath, params.buffer, {
          contentType: params.mimeType,
          upsert: false,
        });

      if (error) {
        throw new InternalServerErrorException(
          `Supabase upload failed: ${error.message}`,
        );
      }

      const { data } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(storagePath);

      return {
        storagePath,
        url: data.publicUrl,
        provider: 'supabase',
      };
    }

    const absolutePath = join(this.uploadRoot, storagePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    await pipeline(Readable.from(params.buffer), createWriteStream(absolutePath));

    return {
      storagePath,
      url: '', // filled after DB id is known
      provider: 'local',
    };
  }

  async delete(storagePath: string): Promise<void> {
    if (this.supabase) {
      await this.supabase.storage.from(this.bucket).remove([storagePath]);
      return;
    }

    const absolutePath = join(this.uploadRoot, storagePath);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }

  resolveLocalPath(storagePath: string) {
    return join(this.uploadRoot, storagePath);
  }
}
