export type DocumentType =
  | 'DRAWING'
  | 'REPORT'
  | 'CONTRACT'
  | 'PURCHASE_DOCUMENT'
  | 'TECHNICAL_FILE'
  | 'IMAGE'
  | 'OTHER';

export const DOCUMENT_TYPES: DocumentType[] = [
  'DRAWING', 'REPORT', 'CONTRACT', 'PURCHASE_DOCUMENT', 'TECHNICAL_FILE', 'IMAGE', 'OTHER',
];

export interface ProjectDocument {
  id: string;
  organizationId: string;
  projectId?: string | null;
  type: DocumentType;
  /** Set when the document is a photo attached to a daily report (SE-5). */
  dailyReportId?: string | null;
  name: string;
  description?: string | null;
  fileKey: string;
  fileUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedById?: string | null;
  createdAt: string;
  updatedAt: string;
}
