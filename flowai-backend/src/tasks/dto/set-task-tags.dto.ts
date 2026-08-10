import { ArrayUnique, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SetTaskTagsDto {
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  tagIds!: number[];
}
