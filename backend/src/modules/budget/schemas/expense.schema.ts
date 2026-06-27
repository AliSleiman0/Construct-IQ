import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type ExpenseDocument = CuidHydratedDocument<Expense>;

@Schema({ collection: 'expenses', timestamps: true })
export class Expense {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Budget', default: null, index: true })
  budgetId: string | null;

  @Prop({ type: String, ref: 'BudgetLine', default: null })
  budgetLineId: string | null;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, default: null })
  reference: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.plugin(softDeletePlugin);
