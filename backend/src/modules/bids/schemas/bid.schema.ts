import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type BidDocument = CuidHydratedDocument<Bid>;

export enum BidExtractionStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export enum BidPriceBasis {
  LUMP_SUM = 'lump sum',
  LABOR_ONLY = 'labor only',
  MATERIALS_ONLY = 'materials only',
  RATE_BASED = 'rate based',
}

export interface BidPaymentTerms {
  advance_percent: number | null;
  structure: string;
}

export interface BidExtractedData {
  contractor: string;
  trade: string;
  total_price: number;
  currency: string;
  price_basis: BidPriceBasis | string;
  inclusions: string[];
  exclusions: string[];
  payment_terms: BidPaymentTerms;
  validity_days: number | null;
  warranty_months: number | null;
  red_flags: string[];
  scope_completeness_score: number;
  summary: string;
}

@Schema({ collection: 'bids', timestamps: true })
export class Bid {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  tradePackage: string;

  @Prop({ type: String, ref: 'DocumentEntity', required: true })
  sourceDocumentId: string;

  // Original uploaded filename — used to reject re-uploading the same file for
  // the same project + trade package (multiple distinct competing bids are still
  // allowed; only exact re-uploads are blocked). #30
  @Prop({ type: String, default: null })
  sourceFileName: string | null;

  @Prop({
    type: String,
    enum: Object.values(BidExtractionStatus),
    default: BidExtractionStatus.PENDING,
    index: true,
  })
  extractionStatus: BidExtractionStatus;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  extractedData: BidExtractedData | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  aiRawResponse: unknown | null;

  @Prop({ type: String, default: null })
  extractionError: string | null;

  @Prop({ type: String, ref: 'User', required: true })
  uploadedById: string;

  @Prop({ type: Date, default: null })
  extractedAt: Date | null;

  // Award workflow (#36): awarding a bid auto-creates a DRAFT PurchaseOrder.
  // A bid can be awarded once; these stay null until then.
  @Prop({ type: String, ref: 'Supplier', default: null })
  awardedSupplierId: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  awardedById: string | null;

  @Prop({ type: Date, default: null })
  awardedAt: Date | null;

  @Prop({ type: String, ref: 'PurchaseOrder', default: null })
  purchaseOrderId: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const BidSchema = SchemaFactory.createForClass(Bid);

BidSchema.plugin(softDeletePlugin);
BidSchema.index({ organizationId: 1, projectId: 1, tradePackage: 1 });
BidSchema.index({ projectId: 1, extractionStatus: 1 });
