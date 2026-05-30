// Bill of Quantities — a measured line item (qty × rate = planned line cost).
// Backed by the surveyor module's `boq` controller. SME-VALIDATE: `unit` is
// free text (e.g. "m²", "tonnes", "each") — not a fixed taxonomy.
export interface BoqItem {
  id: string;
  organizationId: string;
  projectId: string;
  /** Short reference code, unique within a project (e.g. "C.01.A"). */
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitRate: number;
  /** Always equals quantity × unitRate — computed/enforced by the backend. */
  totalAmount: number;
  /** Locked items cannot be edited (the backend rejects edits) — protects certified BOQs. */
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoqPayload {
  projectId: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitRate: number;
  isLocked?: boolean;
}

// `code` is immutable server-side (updateBoqItem ignores it); the UI omits it from edits.
export interface UpdateBoqPayload {
  description?: string;
  unit?: string;
  quantity?: number;
  unitRate?: number;
  isLocked?: boolean;
}
