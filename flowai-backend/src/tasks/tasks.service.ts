import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Priority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SetTaskTagsDto } from './dto/set-task-tags.dto';
import { AcceptBreakdownDto } from './dto/accept-breakdown.dto';

const taskInclude = {
  tags: {
    include: {
      tag: true,
    },
  },
  _count: {
    select: { comments: true },
  },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(userId: number, dto: CreateTaskDto) {
    const tagIds = await this.assertOwnedTagIds(userId, dto.tagIds ?? []);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? Priority.MEDIUM,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        userId,
        ...(tagIds.length
          ? {
              tags: {
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: taskInclude,
    });

    return this.toTaskResponse(task);
  }

  async findAll(userId: number, query: ListTasksQueryDto) {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
        ...this.dueDateWhere(query.due),
      },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    return tasks.map((task) => this.toTaskResponse(task));
  }

  private dueDateWhere(due?: ListTasksQueryDto['due']) {
    if (!due) return {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfNextWeek = new Date(startOfToday);
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

    switch (due) {
      case 'overdue':
        return { dueDate: { not: null, lt: startOfToday } };
      case 'today':
        return { dueDate: { gte: startOfToday, lt: startOfTomorrow } };
      case 'week':
        return { dueDate: { gte: startOfToday, lt: startOfNextWeek } };
      case 'none':
        return { dueDate: null };
      default:
        return {};
    }
  }

  async findOne(userId: number, id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.userId !== userId) {
      throw new ForbiddenException('No access to this task');
    }
    return this.toTaskResponse(task);
  }

  async update(userId: number, id: number, dto: UpdateTaskDto) {
    await this.assertOwnedTask(userId, id);

    if (dto.tagIds !== undefined) {
      await this.replaceTaskTags(userId, id, dto.tagIds);
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
      include: taskInclude,
    });

    return this.toTaskResponse(task);
  }

  async setTags(userId: number, id: number, dto: SetTaskTagsDto) {
    await this.assertOwnedTask(userId, id);
    await this.replaceTaskTags(userId, id, dto.tagIds);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number) {
    await this.assertOwnedTask(userId, id);
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }

  async listComments(userId: number, taskId: number) {
    await this.assertOwnedTask(userId, taskId);
    return this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(userId: number, taskId: number, dto: CreateCommentDto) {
    await this.assertOwnedTask(userId, taskId);
    return this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: dto.content.trim(),
      },
    });
  }

  async removeComment(userId: number, taskId: number, commentId: number) {
    await this.assertOwnedTask(userId, taskId);
    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.taskId !== taskId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('No access to this comment');
    }
    await this.prisma.taskComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async summary(userId: number) {
    const [todo, inProgress, done] = await Promise.all([
      this.prisma.task.count({
        where: { userId, status: TaskStatus.TODO },
      }),
      this.prisma.task.count({
        where: { userId, status: TaskStatus.IN_PROGRESS },
      }),
      this.prisma.task.count({
        where: { userId, status: TaskStatus.DONE },
      }),
    ]);

    return { todo, inProgress, done, total: todo + inProgress + done };
  }

  async breakdown(userId: number, id: number) {
    const task = await this.assertOwnedTask(userId, id);
    const result = await this.aiService.breakdownTask({
      userId,
      title: task.title,
      description: task.description,
    });

    return {
      taskId: task.id,
      title: task.title,
      suggestions: result.suggestions,
      model: result.model,
      usage: result.usage,
    };
  }

  async acceptBreakdown(userId: number, id: number, dto: AcceptBreakdownDto) {
    const parent = await this.assertOwnedTask(userId, id);
    const parentTags = await this.prisma.taskTag.findMany({
      where: { taskId: id },
      select: { tagId: true },
    });
    const tagIds = parentTags.map((item) => item.tagId);

    const created: ReturnType<TasksService['toTaskResponse']>[] = [];
    for (const item of dto.items) {
      const descriptionParts = [
        item.description?.trim() || '',
        `拆解自任务 #${parent.id}「${parent.title}」`,
      ].filter(Boolean);

      const task = await this.prisma.task.create({
        data: {
          title: item.title.trim(),
          description: descriptionParts.join('\n'),
          status: TaskStatus.TODO,
          priority: parent.priority,
          userId,
          parentTaskId: parent.id,
          ...(tagIds.length
            ? {
                tags: {
                  create: tagIds.map((tagId) => ({ tagId })),
                },
              }
            : {}),
        },
        include: taskInclude,
      });
      created.push(this.toTaskResponse(task));
    }

    return { created };
  }

  private async assertOwnedTask(userId: number, id: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.userId !== userId) {
      throw new ForbiddenException('No access to this task');
    }
    return task;
  }

  private async assertOwnedTagIds(userId: number, tagIds: number[]) {
    const unique = [...new Set(tagIds)];
    if (unique.length === 0) return [];

    const tags = await this.prisma.tag.findMany({
      where: { userId, id: { in: unique } },
      select: { id: true },
    });
    if (tags.length !== unique.length) {
      throw new BadRequestException('One or more tags are invalid');
    }
    return unique;
  }

  private async replaceTaskTags(
    userId: number,
    taskId: number,
    tagIds: number[],
  ) {
    const owned = await this.assertOwnedTagIds(userId, tagIds);
    await this.prisma.$transaction([
      this.prisma.taskTag.deleteMany({ where: { taskId } }),
      ...(owned.length
        ? [
            this.prisma.taskTag.createMany({
              data: owned.map((tagId) => ({ taskId, tagId })),
            }),
          ]
        : []),
    ]);
  }

  private toTaskResponse(task: {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: Priority;
    dueDate: Date | null;
    userId: number;
    parentTaskId: number | null;
    createdAt: Date;
    updatedAt: Date;
    tags: {
      tag: { id: number; name: string; userId: number; createdAt: Date };
    }[];
    _count: { comments: number };
  }) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      userId: task.userId,
      parentTaskId: task.parentTaskId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      tags: task.tags.map((item) => item.tag),
      commentCount: task._count.comments,
    };
  }
}
