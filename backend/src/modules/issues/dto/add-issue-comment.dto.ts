import { IsString, MaxLength } from 'class-validator';

export class AddIssueCommentDto {
  @IsString()
  @MaxLength(2000)
  body!: string;
}
