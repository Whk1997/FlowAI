import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: number, dto: CreateTagDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new ConflictException('Tag name is required');
    }

    try {
      return await this.prisma.tag.create({
        data: { name, userId },
      });
    } catch {
      throw new ConflictException('Tag already exists');
    }
  }

  async remove(userId: number, id: number) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    if (tag.userId !== userId) {
      throw new ForbiddenException('No access to this tag');
    }
    await this.prisma.tag.delete({ where: { id } });
    return { success: true };
  }
}
