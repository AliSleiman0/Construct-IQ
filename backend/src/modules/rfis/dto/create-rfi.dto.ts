import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { RfiDiscipline } from '../../../common/enums';

export class CreateRfiDto {
  @IsString()
  projectId!: string;

  @IsString()
  subject!: string;

  @IsString()
  question!: string;

  @IsOptional()
  @IsEnum(RfiDiscipline)
  discipline?: RfiDiscipline;

  @IsOptional()
  @IsString()
  respondentId?: string;

  @IsOptional()
  @IsDateString()
  dueBy?: string;
}
