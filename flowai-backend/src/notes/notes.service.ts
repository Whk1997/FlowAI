import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { AiService } from '../ai/ai.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQueryDto } from './dto/list-notes-query.dto';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly aiService: AiService,
  ) {}

  create(userId: number, dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        title: dto.title.trim(),
        content: dto.content ?? '',
        userId,
      },
    });
  }

  async findAll(userId: number, query: ListNotesQueryDto) {
    const isArchived = query.isArchived ?? false;
    const q = query.q?.trim();

    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        isArchived,
        ...(query.isFavorite !== undefined
          ? { isFavorite: query.isFavorite }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!q) {
      return notes.map(({ content, ...rest }) => ({
        ...rest,
        content: '',
        snippet: this.makePreview(content),
      }));
    }

    const needle = q.toLowerCase();
    // 搜索相关度：标题命中 > 仅正文命中；同档再按收藏/更新时间
    const ranked = [...notes].sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(needle) ? 1 : 0;
      const bTitle = b.title.toLowerCase().includes(needle) ? 1 : 0;
      if (aTitle !== bTitle) return bTitle - aTitle;
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return ranked.map((note) => ({
      ...note,
      content: '',
      snippet:
        this.makeSnippet(note.content, q) ?? this.makePreview(note.content),
    }));
  }

  async findOne(userId: number, id: number) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        files: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('No access to this note');
    }

    return {
      ...note,
      files: note.files.map((file) => ({
        id: file.id,
        name: file.name,
        url: file.url || `/api/files/${file.id}/download`,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        noteId: file.noteId,
        createdAt: file.createdAt,
      })),
    };
  }

  async update(userId: number, id: number, dto: UpdateNoteDto) {
    await this.findOne(userId, id);

    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.isFavorite !== undefined ? { isFavorite: dto.isFavorite } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    await this.filesService.removeByNoteId(id);
    await this.prisma.note.delete({ where: { id } });
    return { success: true };
  }

  recent(userId: number, take = 5) {
    return this.prisma.note.findMany({
      where: { userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        isFavorite: true,
      },
    });
  }

  private makePreview(content: string, max = 100) {
    const text = content.replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  private makeSnippet(content: string, q: string, radius = 48) {
    const text = content.replace(/\s+/g, ' ').trim();
    if (!text) return null;
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx < 0) return null;
    const start = Math.max(0, idx - radius);
    const end = Math.min(text.length, idx + needle.length + radius);
    const slice = text.slice(start, end);
    return `${start > 0 ? '…' : ''}${slice}${end < text.length ? '…' : ''}`;
  }

  async summarize(userId: number, id: number) {
    const note = await this.getOwnedNote(userId, id);
    const result = await this.aiService.summarizeNote({
      userId,
      title: note.title,
      content: note.content,
    });

    return {
      noteId: note.id,
      title: note.title,
      ...result,
    };
  }

  async *summarizeStream(userId: number, id: number) {
    const note = await this.getOwnedNote(userId, id);
    yield {
      type: 'meta' as const,
      noteId: note.id,
      title: note.title,
    };

    for await (const event of this.aiService.summarizeNoteStream({
      userId,
      title: note.title,
      content: note.content,
    })) {
      yield event;
    }
  }

  private async getOwnedNote(userId: number, id: number) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('No access to this note');
    }
    return note;
  }
}
