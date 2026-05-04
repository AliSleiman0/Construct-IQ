import { IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';
import { TicketStatus, TicketPriority } from '../../../common/enums';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
