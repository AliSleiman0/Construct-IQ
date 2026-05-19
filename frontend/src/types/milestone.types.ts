export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Milestone {
  id: string;
  organizationId: string;
  projectId: string;
  phaseId?: string | null;
  name: string;
  description?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  status: MilestoneStatus;
  percentComplete: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestonePayload {
  name: string;
  description?: string;
  phaseId?: string;
  targetDate?: string;
  status?: MilestoneStatus;
  percentComplete?: number;
}

export type UpdateMilestonePayload = Partial<CreateMilestonePayload>;
