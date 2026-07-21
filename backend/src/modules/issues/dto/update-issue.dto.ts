import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { IssueStatus } from '../../../common/enums';
import { PartialType } from '@nestjs/mapped-types';
import { CreateIssueDto } from './create-issue.dto';

export class UpdateIssueDto extends PartialType(CreateIssueDto) {
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}
