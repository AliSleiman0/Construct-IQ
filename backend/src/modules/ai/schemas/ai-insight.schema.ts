import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { AIInsightType, AIInsightSeverity } from '../../../common/enums';

export type AIInsightDocument = CuidHydratedDocument<AIInsight>;

@Schema({ collection: 'ai_insights', timestamps: true })
export class AIInsight {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({
    type: String,
    enum: Object.values(AIInsightType),
    default: AIInsightType.GENERAL,
    index: true,
  })
  type: AIInsightType;

  @Prop({
    type: String,
    enum: Object.values(AIInsightSeverity),
    default: AIInsightSeverity.MEDIUM,
    index: true,
  })
  severity: AIInsightSeverity;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, default: null })
  recommendation: string | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  metadata: Record<string, unknown> | null;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const AIInsightSchema = SchemaFactory.createForClass(AIInsight);
