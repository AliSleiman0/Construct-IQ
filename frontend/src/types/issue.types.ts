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
  inspectionId?: string | null;
  inspection?: { id: string; title: string } | null;
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
  inspectionId?: string;
}

export type UpdateIssuePayload = Partial<Omit<CreateIssuePayload, 'projectId'>> & {
  status?: IssueStatus;
  resolvedAt?: string | null;
};

/** Query params for the paginated org-wide triage list. */
export interface IssueListParams {
  projectId?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
  type?: IssueType;
  /** A userId, or the literal 'NONE' for unassigned. */
  assignedToId?: string;
  search?: string;
  /** 'smart' (default) | 'createdAt' | 'severity' | 'status' | 'title' */
  sort?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
}

export interface PaginatedIssues {
  items: Issue[];
  total: number;
  limit: number;
  skip: number;
}

export interface IssueSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  critical: number;
  unassigned: number;
  stale: number;
}

export interface BulkUpdateIssuesPayload {
  ids: string[];
  status?: IssueStatus;
  /** A userId, or '' to unassign. */
  assignedToId?: string;
}
