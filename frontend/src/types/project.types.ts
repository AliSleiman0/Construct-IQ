export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface ProjectMember {
  id: string;
  role?: string | null;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface Phase {
  id: string;
  name: string;
  order: number;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  location?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  totalBudget?: number | null;
  currency: string;
  organizationId: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    tasks: number;
    issues: number;
  };
  members?: ProjectMember[];
  phases?: Phase[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  code?: string;
  location?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export interface AddMemberPayload {
  userId: string;
  role?: string;
}

export interface UpdateMemberPayload {
  role?: string;
}
