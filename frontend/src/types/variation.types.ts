// A Variation = a change order against the contract. `impactAmount` is signed
// (+ addition / − deduction). Lifecycle PENDING → APPROVED / REJECTED; approving
// stamps the approver. Backed by the surveyor module's `variations` controller.
export type VariationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Variation {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string | null;
  /** Signed: positive = addition to contract, negative = deduction. */
  impactAmount: number;
  currency: string;
  status: VariationStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariationPayload {
  projectId: string;
  title: string;
  impactAmount: number;
  description?: string;
  currency?: string;
}

export interface UpdateVariationPayload {
  title?: string;
  description?: string;
  impactAmount?: number;
  status?: VariationStatus;
}
