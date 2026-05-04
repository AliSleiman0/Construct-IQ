import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type DailyReportDocument = CuidHydratedDocument<DailyReport>;

// Embedded — DailyReportManpowerEntry has no independent lifecycle.
@Schema({ _id: false, timestamps: false })
export class DailyReportManpowerEntry {
  @Prop({ type: String, required: true })
  trade: string;

  @Prop({ type: Number, required: true, min: 0 })
  count: number;

  @Prop({ type: String, default: null })
  contractor: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const DailyReportManpowerEntrySchema = SchemaFactory.createForClass(
  DailyReportManpowerEntry,
);

// Embedded — DailyReportMaterialEntry has no independent lifecycle.
@Schema({ _id: false, timestamps: false })
export class DailyReportMaterialEntry {
  @Prop({ type: String, required: true })
  material: string;

  // Was Decimal(10,2) under Postgres; double precision is enough for site
  // material qty. Migrate to Decimal128 if cost accounting precision is needed.
  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const DailyReportMaterialEntrySchema = SchemaFactory.createForClass(
  DailyReportMaterialEntry,
);

@Schema({ collection: 'daily_reports', timestamps: true })
export class DailyReport {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: Date, required: true })
  reportDate: Date;

  @Prop({ type: String, default: null })
  weather: string | null;

  @Prop({ type: String, default: null })
  temperature: string | null;

  @Prop({ type: String, default: null })
  achievements: string | null;

  @Prop({ type: String, default: null })
  blockers: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, default: null })
  aiSummary: string | null;

  @Prop({ type: Date, default: null })
  aiSummaryAt: Date | null;

  @Prop({ type: String, ref: 'User', required: true })
  createdById: string;

  @Prop({ type: [DailyReportManpowerEntrySchema], default: [] })
  manpowerEntries: DailyReportManpowerEntry[];

  @Prop({ type: [DailyReportMaterialEntrySchema], default: [] })
  materialEntries: DailyReportMaterialEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export const DailyReportSchema = SchemaFactory.createForClass(DailyReport);

DailyReportSchema.index({ projectId: 1, reportDate: -1 }, { unique: true });
