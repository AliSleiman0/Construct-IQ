export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ManpowerEntry {
  trade: string;
  count: number;
  contractor?: string | null;
  notes?: string | null;
}

export interface MaterialEntry {
  material: string;
  quantity: number;
  unit: string;
  notes?: string | null;
}

export interface EquipmentEntry {
  name: string;
  hours: number;
  notes?: string | null;
}

export interface DailyReport {
  id: string;
  projectId: string;
  project?: { id: string; name: string } | null;
  reportDate: string;
  weather?: string | null;
  highTempC?: number | null;
  lowTempC?: number | null;
  workCompleted?: string | null;
  blockers?: string | null;
  notes?: string | null;
  aiSummary?: string | null;
  aiSummaryAt?: string | null;
  manpowerEntries?: ManpowerEntry[];
  materialEntries?: MaterialEntry[];
  equipmentEntries?: EquipmentEntry[];
  createdById?: string | null;
  createdBy?: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  projectId: string;
  reportDate: string;
  weather?: string;
  highTempC?: number;
  lowTempC?: number;
  workCompleted?: string;
  blockers?: string;
  notes?: string;
  manpowerEntries?: ManpowerEntry[];
  materialEntries?: MaterialEntry[];
  equipmentEntries?: EquipmentEntry[];
}

export type UpdateReportPayload = Partial<Omit<CreateReportPayload, 'projectId'>>;
