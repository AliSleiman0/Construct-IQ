export type BidExtractionStatus = 'PENDING' | 'COMPLETE' | 'FAILED';

export type BidPriceBasis =
  | 'lump sum'
  | 'labor only'
  | 'materials only'
  | 'rate based';

export interface BidPaymentTerms {
  advance_percent: number | null;
  structure: string;
}

export interface BidExtractedData {
  contractor: string;
  trade: string;
  total_price: number;
  currency: string;
  price_basis: BidPriceBasis;
  inclusions: string[];
  exclusions: string[];
  payment_terms: BidPaymentTerms;
  validity_days: number | null;
  warranty_months: number | null;
  red_flags: string[];
  scope_completeness_score: number;
  summary: string;
}

export interface Bid {
  id: string;
  organizationId: string;
  projectId: string;
  tradePackage: string;
  sourceDocumentId: string;
  uploadedById: string;
  extractionStatus: BidExtractionStatus;
  extractedData: BidExtractedData | null;
  extractionError: string | null;
  extractedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadBidsPayload {
  projectId: string;
  tradePackage: string;
  files: File[];
}
