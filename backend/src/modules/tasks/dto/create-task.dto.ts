import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
  IsArray,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../../../common/enums';

export class CreateTaskDto {
  @IsString()
  projectId!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependsOnTaskIds?: string[];
}
