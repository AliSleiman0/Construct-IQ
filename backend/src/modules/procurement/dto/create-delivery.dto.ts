import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { DeliveryStatus } from '../../../common/enums';

export class CreateDeliveryDto {
  @IsString() purchaseOrderId!: string;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsEnum(DeliveryStatus) status?: DeliveryStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateDeliveryDto {
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsEnum(DeliveryStatus) status?: DeliveryStatus;
  @IsOptional() @IsString() receivedById?: string;
  @IsOptional() @IsString() notes?: string;
}

/**
 * Goods-received confirmation by the receiving site engineer (SE-7).
 * `status` is forced to DELIVERED and `receivedById` to the current user
 * server-side — neither is client-settable here.
 */
export class ConfirmDeliveryDto {
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() notes?: string;
}
