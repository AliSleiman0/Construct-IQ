import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type BudgetLineDocument = CuidHydratedDocument<BudgetLine>;

@Schema({ collection: 'budget_lines', timestamps: true })
export class BudgetLine {
  _id: string;

  @Prop({ type: String, ref: 'Budget', required: true, index: true })
  budgetId: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  plannedAmount: number;

  @Prop({ type: String, default: null })
  notes: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const BudgetLineSchema = SchemaFactory.createForClass(BudgetLine);

BudgetLineSchema.plugin(softDeletePlugin);
