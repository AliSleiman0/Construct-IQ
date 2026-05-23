import { IsEnum, IsArray, ArrayNotEmpty, IsString } from 'class-validator';
import { TaskStatus } from '../../../common/enums';

/**
 * Persist the order of cards within a single Kanban column. `taskIds` is the column's
 * full ordered list (top → bottom); each task's `position` becomes its index and its
 * `status` is set to `status` (so this also commits a cross-column drop).
 */
export class ReorderTasksDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  taskIds!: string[];
}
