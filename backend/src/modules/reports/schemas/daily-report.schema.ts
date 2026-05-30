import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type DailyReportDocument = CuidHydratedDocument<DailyReport>;

// Embedded — no independent lifecycle.
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

// Embedded — no independent lifecycle.
@Schema({ _id: false, timestamps: false })
export class DailyReportMaterialEntry {
  @Prop({ type: String, required: true })
  material: string;

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

// Embedded — no independent lifecycle.
@Schema({ _id: false, timestamps: false })
export class DailyReportEquipmentEntry {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true, min: 0 })
  hours: number;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const DailyReportEquipmentEntrySchema = SchemaFactory.createForClass(
  DailyReportEquipmentEntry,
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

  // Celsius — two separate fields so charts can plot the range.
  @Prop({ type: Number, default: null })
  highTempC: number | null;

  @Prop({ type: Number, default: null })
  lowTempC: number | null;

  @Prop({ type: String, default: null })
  workCompleted: string | null;

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

  @Prop({ type: [DailyReportEquipmentEntrySchema], default: [] })
  equipmentEntries: DailyReportEquipmentEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export const DailyReportSchema = SchemaFactory.createForClass(DailyReport);

DailyReportSchema.index({ projectId: 1, reportDate: -1 }, { unique: true });
// Backs the org-wide sorted + paginated list and the date-range filter.
DailyReportSchema.index({ organizationId: 1, reportDate: -1 });
