// A Valuation = an interim progress claim for a billing period. `amountUsd` is
// the gross value claimed this period; `retentionUsd` is the amount withheld
// (plain manual input — the retention % rule is SME-gated, not computed here).
// Lifecycle DRAFT → SUBMITTED → CERTIFIED; certifying stamps the certifier.
// Backed by the surveyor module's `valuations` controller. There is no delete
// endpoint — valuations are not removable once raised.
export type ValuationStatus = 'DRAFT' | 'SUBMITTED' | 'CERTIFIED';

export interface Valuation {
  id: string;
  organizationId: string;
  projectId: string;
  /** Billing period label, e.g. "April 2026", "Q2 2026". Unique per project. */
  period: string;
  amountUsd: number;
  /** Retention withheld this period. Manual input — no computed %. */
  retentionUsd: number;
  status: ValuationStatus;
  certifiedById?: string | null;
  certifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateValuationPayload {
  projectId: string;
  period: string;
  amountUsd: number;
  retentionUsd?: number;
}

// `period` is immutable server-side (UpdateValuationDto omits it) → not editable.
export interface UpdateValuationPayload {
  amountUsd?: number;
  retentionUsd?: number;
  status?: ValuationStatus;
}
