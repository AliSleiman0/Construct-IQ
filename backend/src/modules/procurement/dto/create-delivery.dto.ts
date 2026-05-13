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
