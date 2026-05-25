import { IsString } from 'class-validator';

/** Manager's formal answer to an RFI (SE-8). respondent/status are forced server-side. */
export class AnswerRfiDto {
  @IsString()
  answer!: string;
}
