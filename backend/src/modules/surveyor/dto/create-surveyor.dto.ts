import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ValuationStatus } from '../schemas/valuation.schema';
import { IsEnum } from 'class-validator';

export class CreateBoqItemDto {
  @IsString() projectId!: string;
  @IsString() @MaxLength(50) code!: string;
  @IsString() description!: string;
  @IsString() unit!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsNumber() @Min(0) unitRate!: number;
  @IsOptional() @IsBoolean() isLocked?: boolean;
}

export class CreateVariationDto {
  @IsString() projectId!: string;
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() impactAmount!: number;
  @IsOptional() @IsString() currency?: string;
}

export class UpdateVariationDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() impactAmount?: number;
  // `status` is intentionally NOT settable here — APPROVED/REJECTED transitions go
  // through the dedicated guarded endpoint (POST /variations/:id/approve). With the
  // global forbidNonWhitelisted pipe, sending `status` to this PATCH now 400s.
}

export class CreateValuationDto {
  @IsString() projectId!: string;
  @IsString() @MaxLength(50) period!: string;
  @IsNumber() @Min(0) amountUsd!: number;
  @IsOptional() @IsNumber() @Min(0) retentionUsd?: number;
}

export class UpdateValuationDto {
  @IsOptional() @IsNumber() @Min(0) amountUsd?: number;
  @IsOptional() @IsNumber() @Min(0) retentionUsd?: number;
  @IsOptional() @IsEnum(ValuationStatus) status?: ValuationStatus;
}
