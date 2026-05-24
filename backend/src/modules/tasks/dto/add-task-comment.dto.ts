import { IsString, MaxLength } from 'class-validator';

export class AddTaskCommentDto {
  @IsString()
  @MaxLength(2000)
  body!: string;
}
