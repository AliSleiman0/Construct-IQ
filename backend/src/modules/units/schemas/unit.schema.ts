import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { UnitStatus, UnitType } from '../../../common/enums';

export type UnitDocument = CuidHydratedDocument<Unit>;

@Schema({ collection: 'units', timestamps: true })
export class Unit {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  // The building project this unit belongs to
  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  // Human label e.g. "12B", "Floor 3 - Unit 5"
  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Number, required: true })
  floor: number;

  // Alphanumeric slot on the floor plan e.g. "A", "B", "C"
  @Prop({ type: String, default: null })
  position: string | null;

  @Prop({
    type: String,
    enum: Object.values(UnitType),
    default: UnitType.APARTMENT,
  })
  type: UnitType;

  @Prop({ type: Number, default: null, min: 0 })
  bedrooms: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  bathrooms: number | null;

  @Prop({ type: Number, required: true, min: 0 })
  sqft: number;

  @Prop({ type: Number, required: true, min: 0 })
  priceUsd: number;

  @Prop({
    type: String,
    enum: Object.values(UnitStatus),
    default: UnitStatus.AVAILABLE,
    index: true,
  })
  status: UnitStatus;

  // The buyer who reserved/purchased this unit
  @Prop({ type: String, ref: 'User', default: null, index: true })
  buyerId: string | null;

  @Prop({ type: String, default: null })
  imageUrl: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);

UnitSchema.plugin(softDeletePlugin);
UnitSchema.index({ projectId: 1, floor: 1 });
UnitSchema.index({ projectId: 1, status: 1 });
