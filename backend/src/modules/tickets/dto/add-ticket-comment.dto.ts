import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class AddTicketCommentDto {
  @IsString()
  @MaxLength(3000)
  body!: string;

  @IsOptional()
  @IsIn(['reply', 'internal'])
  kind?: 'reply' | 'internal';
}
