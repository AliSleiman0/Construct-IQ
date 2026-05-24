import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DocumentType } from '../../../common/enums';

/**
 * Metadata fields that accompany a multipart file upload. The file itself is
 * read via @UploadedFile(); these come as form fields alongside it.
 */
export class UploadDocumentDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}
