import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { DeliveryStatus } from '../../../common/enums';

export type DeliveryDocument = CuidHydratedDocument<Delivery>;

@Schema({ collection: 'deliveries', timestamps: true })
export class Delivery {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'PurchaseOrder', required: true, index: true })
  purchaseOrderId: string;

  @Prop({ type: Date, default: null })
  deliveryDate: Date | null;

  @Prop({
    type: String,
    enum: Object.values(DeliveryStatus),
    default: DeliveryStatus.PENDING,
    index: true,
  })
  status: DeliveryStatus;

  @Prop({ type: String, ref: 'User', default: null })
  receivedById: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.plugin(softDeletePlugin);
