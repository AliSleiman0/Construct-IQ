import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateRfiDto } from './create-rfi.dto';
import { RfiStatus } from '../../../common/enums';

// PATCH may edit the question fields + respondent + due-by, and close/reopen via
// `status`. The answer fields are NOT settable here — answering is the manager-only
// POST /rfis/:id/answer action.
export class UpdateRfiDto extends PartialType(CreateRfiDto) {
  @IsOptional()
  @IsEnum(RfiStatus)
  status?: RfiStatus;
}
