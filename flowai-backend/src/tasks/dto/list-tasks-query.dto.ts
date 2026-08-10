import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional } from 'class-validator';
import { Priority, TaskStatus } from '@prisma/client';

/** 截止日期快捷筛选 */
export const DUE_FILTERS = ['overdue', 'today', 'week', 'none'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

export class ListTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsIn(DUE_FILTERS)
  due?: DueFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tagId?: number;
}
