export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IssueType = 'GENERAL' | 'TECHNICAL' | 'QUALITY' | 'SAFETY' | 'PROCUREMENT' | 'BUDGET';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Issue {
  id: string;
  title: string;
  description?: string | null;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  projectId: string;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
}

export interface CreateIssuePayload {
  title: string;
  description?: string;
  type: IssueType;
  severity: IssueSeverity;
  assigneeId?: string;
}

export type UpdateIssuePayload = Partial<CreateIssuePayload> & { status?: IssueStatus };
