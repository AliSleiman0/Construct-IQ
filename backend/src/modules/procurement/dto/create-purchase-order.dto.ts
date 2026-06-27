import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../../../common/enums';

export class PurchaseOrderItemDto {
  @IsString() description!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) unitPrice!: number;
  // Server-derived: recomputed as quantity * unitPrice by the PO pre-save hook
  // (applyPoTotals). Kept in the DTO so existing clients don't trip
  // forbidNonWhitelisted; any value sent here is ignored.
  @IsNumber() @Min(0) totalPrice!: number;
  @IsOptional() @IsString() notes?: string;
}

export class RejectPurchaseOrderDto {
  @IsOptional() @IsString() reason?: string;
}

export class CreatePurchaseOrderDto {
  @IsString() projectId!: string;
  @IsString() supplierId!: string;
  @IsOptional() @IsString() budgetLineId?: string;
  @IsString() @MaxLength(50) poNumber!: string;
  @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;
  // Honored only for lump-sum POs with no line items. When items are present the
  // pre-save hook (applyPoTotals) derives this from sum(items.totalPrice).
  @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @IsOptional() @IsString() currency?: string;
  @IsDateString() orderDate!: string;
  @IsOptional() @IsDateString() expectedDeliveryDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items?: PurchaseOrderItemDto[];
}
