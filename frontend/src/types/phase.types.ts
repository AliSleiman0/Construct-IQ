export type PhaseStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Phase {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  description?: string | null;
  order: number;
  startDate?: string | null;
  endDate?: string | null;
  status: PhaseStatus;
  dependsOnPhaseIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhasePayload {
  name: string;
  description?: string;
  order?: number;
  startDate?: string;
  endDate?: string;
  status?: PhaseStatus;
  dependsOnPhaseIds?: string[];
}

export type UpdatePhasePayload = Partial<CreatePhasePayload>;
