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

  findAll(userId: number, query: ListNotesQueryDto) {
    const isArchived = query.isArchived ?? false;
    const q = query.q?.trim();

    return this.prisma.note.findMany({
      where: {
        userId,
        isArchived,
        ...(query.isFavorite !== undefined
          ? { isFavorite: query.isFavorite }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { content: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
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
        ...(dto.isFavorite !== undefined
          ? { isFavorite: dto.isFavorite }
          : {}),
        ...(dto.isArchived !== undefined
          ? { isArchived: dto.isArchived }
          : {}),
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

  async summarize(userId: number, id: number) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('No access to this note');
    }

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
}
