export interface DailyReport {
  id: string;
  projectId: string;
  reportDate: string;
  weather?: string | null;
  achievements?: string | null;
  blockers?: string | null;
  notes?: string | null;
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateReportPayload {
  reportDate: string;
  weather?: string;
  achievements?: string;
  blockers?: string;
  notes?: string;
}

export type UpdateReportPayload = Partial<CreateReportPayload>;
