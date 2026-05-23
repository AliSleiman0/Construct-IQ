export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IssueType = 'GENERAL' | 'TECHNICAL' | 'QUALITY' | 'SAFETY' | 'PROCUREMENT' | 'BUDGET';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface IssueComment {
  id: string;
  authorId: string | null;
  author?: UserRef | null;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string | null;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  projectId: string;
  project?: { id: string; name: string } | null;
  location?: string | null;
  trade?: string | null;
  assignedToId?: string | null;
  assignedTo?: UserRef | null;
  createdById?: string | null;
  createdBy?: UserRef | null;
  resolvedAt?: string | null;
  comments?: IssueComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssuePayload {
  projectId: string;
  title: string;
  description?: string;
  type: IssueType;
  severity: IssueSeverity;
  location?: string;
  trade?: string;
  assignedToId?: string;
}

export type UpdateIssuePayload = Partial<Omit<CreateIssuePayload, 'projectId'>> & {
  status?: IssueStatus;
  resolvedAt?: string | null;
};
