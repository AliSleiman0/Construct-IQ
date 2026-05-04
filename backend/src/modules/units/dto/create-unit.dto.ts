import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { UnitStatus, UnitType } from '../../../common/enums';

export class CreateUnitDto {
  @IsString() projectId!: string;
  @IsString() @MaxLength(50) label!: string;
  @IsNumber() floor!: number;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsEnum(UnitType) type?: UnitType;
  @IsOptional() @IsNumber() @Min(0) bedrooms?: number;
  @IsOptional() @IsNumber() @Min(0) bathrooms?: number;
  @IsNumber() @Min(0) sqft!: number;
  @IsNumber() @Min(0) priceUsd!: number;
  @IsOptional() @IsEnum(UnitStatus) status?: UnitStatus;
  @IsOptional() @IsString() buyerId?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreatePaymentDto {
  @IsString() unitId!: string;
  @IsString() buyerId!: string;
  @IsNumber() @Min(1) installmentNo!: number;
  @IsNumber() @Min(1) totalInstallments!: number;
  @IsString() label!: string;
  @IsNumber() @Min(0) amountUsd!: number;
  @IsString() dueDate!: string;
  @IsOptional() @IsString() invoiceNumber?: string;
}

export class CreateProgressPhotoDto {
  @IsString() projectId!: string;
  @IsOptional() @IsString() milestoneId?: string;
  @IsString() url!: string;
  @IsOptional() @IsString() caption?: string;
  @IsString() takenAt!: string;
}
