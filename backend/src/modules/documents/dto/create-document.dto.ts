import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { DocumentType } from '../../../common/enums';

export class CreateDocumentDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() dailyReportId?: string;
  @IsOptional() @IsString() issueId?: string;
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() fileKey!: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsNumber() @Min(0) sizeBytes?: number;
}
