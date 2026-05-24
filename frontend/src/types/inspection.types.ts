export type InspectionType =
  | 'SAFETY'
  | 'QUALITY'
  | 'STRUCTURAL'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'PLUMBING'
  | 'GENERAL';

export type InspectionStatus = 'SCHEDULED' | 'PASSED' | 'FAILED' | 'CANCELLED';

export interface InspectionUserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Inspection {
  id: string;
  organizationId: string;
  projectId: string;
  project?: { id: string; name: string } | null;
  title: string;
  description?: string | null;
  type: InspectionType;
  status: InspectionStatus;
  scheduledFor?: string | null;
  inspectorId?: string | null;
  inspector?: InspectionUserRef | null;
  location?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: InspectionUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInspectionPayload {
  projectId: string;
  title: string;
  description?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  scheduledFor?: string;
  inspectorId?: string;
  location?: string;
  notes?: string;
}

export type UpdateInspectionPayload = Partial<Omit<CreateInspectionPayload, 'projectId'>>;

export interface InspectionListParams {
  projectId?: string;
  status?: InspectionStatus;
  type?: string;
}

export const INSPECTION_TYPES: InspectionType[] = [
  'SAFETY',
  'QUALITY',
  'STRUCTURAL',
  'ELECTRICAL',
  'MECHANICAL',
  'PLUMBING',
  'GENERAL',
];

export const INSPECTION_STATUSES: InspectionStatus[] = [
  'SCHEDULED',
  'PASSED',
  'FAILED',
  'CANCELLED',
];

export const INSPECTION_STATUS_LABEL: Record<InspectionStatus, string> = {
  SCHEDULED: 'Scheduled',
  PASSED: 'Passed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};
