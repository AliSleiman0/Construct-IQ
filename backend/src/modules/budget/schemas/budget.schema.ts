import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type BudgetDocument = CuidHydratedDocument<Budget>;

@Schema({ collection: 'budgets', timestamps: true })
export class Budget {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  // One-to-one with Project. Unique index enforces that.
  @Prop({ type: String, ref: 'Project', required: true })
  projectId: string;

  // Was Decimal(15,2) under Postgres. Switch to Decimal128 if accounting
  // precision becomes load-bearing for downstream reports.
  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, default: null })
  notes: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

BudgetSchema.plugin(softDeletePlugin);
BudgetSchema.index({ projectId: 1 }, { unique: true });
