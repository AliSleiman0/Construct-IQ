import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { MilestoneStatus } from '../../../common/enums';

export class CreateMilestoneDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete?: number;
}
