import { IsString, IsOptional, ValidateIf } from 'class-validator';

/**
 * Mutates an existing document's report link. `dailyReportId` accepts a string
 * (attach the document to that daily report) or `null` (unlink it back to the
 * project library). `ValidateIf` lets the explicit `null` through the global
 * `forbidNonWhitelisted` pipe.
 */
export class UpdateDocumentDto {
  @IsOptional()
  @ValidateIf((o) => o.dailyReportId !== null)
  @IsString()
  dailyReportId?: string | null;
}
