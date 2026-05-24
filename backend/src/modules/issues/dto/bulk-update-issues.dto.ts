import { IsArray, ArrayMaxSize, ArrayNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { IssueStatus } from '../../../common/enums';

export class BulkUpdateIssuesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  /** A userId to reassign to, or '' to unassign. */
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
