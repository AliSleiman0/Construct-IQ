import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { InvoiceStatus } from '../../../common/enums';

export class CreateInvoiceDto {
  @IsString() organizationId!: string;
  @IsString() planId!: string;
  @IsString() @MaxLength(50) number!: string;
  @IsNumber() @Min(0) amountUsd!: number;
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @IsDateString() issuedAt!: string;
  @IsDateString() dueAt!: string;
  @IsOptional() @IsString() notes?: string;
}
