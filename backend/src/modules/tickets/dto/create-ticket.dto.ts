import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { TicketPriority } from '../../../common/enums';

export class CreateTicketDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
