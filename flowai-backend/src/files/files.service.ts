import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from './files.constants';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async assertNoteOwner(userId: number, noteId: number) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('No access to this note');
    }
    return note;
  }

  private toPublicFile(file: {
    id: number;
    name: string;
    url: string;
    mimeType: string | null;
    sizeBytes: number | null;
    storagePath: string;
    noteId: number;
    createdAt: Date;
  }) {
    const url =
      file.url ||
      (this.storage.provider === 'local'
        ? `/api/files/${file.id}/download`
        : file.url);

    return {
      id: file.id,
      name: file.name,
      url,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      noteId: file.noteId,
      createdAt: file.createdAt,
    };
  }

  async upload(userId: number, noteId: number, file?: UploadedFile) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!isAllowedMimeType(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 10MB limit');
    }

    await this.assertNoteOwner(userId, noteId);

    const stored = await this.storage.upload({
      noteId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    const created = await this.prisma.file.create({
      data: {
        name: file.originalname,
        url: stored.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: stored.storagePath,
        noteId,
      },
    });

    if (!created.url && this.storage.provider === 'local') {
      const url = `/api/files/${created.id}/download`;
      const updated = await this.prisma.file.update({
        where: { id: created.id },
        data: { url },
      });
      return this.toPublicFile(updated);
    }

    return this.toPublicFile(created);
  }

  async findOne(userId: number, id: number) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: { note: true },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (file.note.userId !== userId) {
      throw new ForbiddenException('No access to this file');
    }
    return this.toPublicFile(file);
  }

  async getDownload(userId: number, id: number) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: { note: true },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (file.note.userId !== userId) {
      throw new ForbiddenException('No access to this file');
    }

    if (this.storage.provider === 'supabase') {
      return {
        kind: 'redirect' as const,
        url: file.url,
        name: file.name,
        mimeType: file.mimeType,
      };
    }

    return {
      kind: 'local' as const,
      path: this.storage.resolveLocalPath(file.storagePath),
      name: file.name,
      mimeType: file.mimeType,
    };
  }

  async remove(userId: number, id: number) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: { note: true },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (file.note.userId !== userId) {
      throw new ForbiddenException('No access to this file');
    }

    await this.storage.delete(file.storagePath);
    await this.prisma.file.delete({ where: { id } });
    return { success: true };
  }

  async removeByNoteId(noteId: number) {
    const files = await this.prisma.file.findMany({ where: { noteId } });
    for (const file of files) {
      try {
        await this.storage.delete(file.storagePath);
      } catch {
        // continue deleting remaining files
      }
    }
  }
}
