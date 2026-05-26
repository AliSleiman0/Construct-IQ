import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { IssueType, IssueSeverity } from '../../../common/enums';

export class CreateIssueDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(IssueType)
  type?: IssueType;

  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  trade?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  inspectionId?: string;
}
