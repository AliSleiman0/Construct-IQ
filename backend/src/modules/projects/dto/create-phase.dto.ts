import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../../../common/enums';

export class CreatePhaseDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
