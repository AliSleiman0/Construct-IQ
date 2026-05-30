export type RfiStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export type RfiDiscipline =
  | 'ARCHITECTURAL'
  | 'STRUCTURAL'
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'CIVIL'
  | 'GENERAL';

export interface RfiUserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Rfi {
  id: string;
  organizationId: string;
  projectId: string;
  project?: { id: string; name: string } | null;
  number: string;
  subject: string;
  question: string;
  discipline: RfiDiscipline;
  status: RfiStatus;
  respondentId?: string | null;
  respondent?: RfiUserRef | null;
  dueBy?: string | null;
  answer?: string | null;
  answeredById?: string | null;
  answeredBy?: RfiUserRef | null;
  answeredAt?: string | null;
  createdById?: string | null;
  createdBy?: RfiUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRfiPayload {
  projectId: string;
  subject: string;
  question: string;
  discipline?: RfiDiscipline;
  respondentId?: string;
  dueBy?: string;
}

export interface UpdateRfiPayload {
  subject?: string;
  question?: string;
  discipline?: RfiDiscipline;
  respondentId?: string;
  dueBy?: string;
  status?: RfiStatus;
}

export interface AnswerRfiPayload {
  answer: string;
}

export interface RfiListParams {
  projectId?: string;
  status?: RfiStatus;
  discipline?: string;
}

export const RFI_DISCIPLINES: RfiDiscipline[] = [
  'ARCHITECTURAL',
  'STRUCTURAL',
  'MECHANICAL',
  'ELECTRICAL',
  'PLUMBING',
  'CIVIL',
  'GENERAL',
];

export const RFI_STATUSES: RfiStatus[] = ['OPEN', 'ANSWERED', 'CLOSED'];

export const RFI_STATUS_LABEL: Record<RfiStatus, string> = {
  OPEN: 'Open',
  ANSWERED: 'Answered',
  CLOSED: 'Closed',
};

export const RFI_DISCIPLINE_LABEL: Record<RfiDiscipline, string> = {
  ARCHITECTURAL: 'Architectural',
  STRUCTURAL: 'Structural',
  MECHANICAL: 'Mechanical',
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  CIVIL: 'Civil',
  GENERAL: 'General',
};
