import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { DocumentType } from '../../../common/enums';

export type DocumentEntityDocument = CuidHydratedDocument<DocumentEntity>;

// Class name avoids the global `Document` clash.
@Schema({ collection: 'documents', timestamps: true })
export class DocumentEntity {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', default: null, index: true })
  projectId: string | null;

  @Prop({ type: String, ref: 'DailyReport', default: null })
  dailyReportId: string | null;

  @Prop({ type: String, ref: 'Issue', default: null })
  issueId: string | null;

  @Prop({
    type: String,
    enum: Object.values(DocumentType),
    default: DocumentType.OTHER,
  })
  type: DocumentType;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, required: true })
  fileKey: string;

  @Prop({ type: String, default: null })
  fileUrl: string | null;

  @Prop({ type: String, default: null })
  mimeType: string | null;

  @Prop({ type: Number, default: null, min: 0 })
  sizeBytes: number | null;

  @Prop({ type: String, ref: 'User', default: null })
  uploadedById: string | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  metadata: Record<string, unknown> | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DocumentEntitySchema = SchemaFactory.createForClass(DocumentEntity);

DocumentEntitySchema.plugin(softDeletePlugin);
