import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type DashboardSnapshotDocument = CuidHydratedDocument<DashboardSnapshot>;

/**
 * A persisted snapshot of the org-level dashboard metrics (#36). Read-through
 * cache: getOrgDashboard serves a fresh snapshot and falls back to live compute
 * (then writes back) when stale/absent; a cron keeps snapshots warm. One row per
 * organization (upserted).
 */
@Schema({ collection: 'dashboard_snapshots', timestamps: true })
export class DashboardSnapshot {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, unique: true, index: true })
  organizationId: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  payload: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  computedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const DashboardSnapshotSchema = SchemaFactory.createForClass(DashboardSnapshot);
