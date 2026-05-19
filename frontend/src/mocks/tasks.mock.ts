import type { Task, TaskPriority, TaskStatus } from '@/types/task.types';

export interface MockBoardTask extends Task {
  code: string;
  projectTag: string;
  phaseTag?: string;
  sprintTag?: string;
}

interface MockAssignee {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

const assignees: MockAssignee[] = [
  { id: 'u-pete', firstName: 'Pete', lastName: 'Williams' },
  { id: 'u-priya', firstName: 'Priya', lastName: 'Singh' },
  { id: 'u-sara', firstName: 'Sara', lastName: 'Khalil' },
  { id: 'u-carlos', firstName: 'Carlos', lastName: 'Rivera' },
  { id: 'u-olivia', firstName: 'Olivia', lastName: 'Romero' },
  { id: 'u-sebastian', firstName: 'Sebastian', lastName: 'Diaz' },
];

const now = '2026-05-19T09:00:00.000Z';

interface Seed {
  code: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectTag: string;
  phaseTag?: string;
  sprintTag?: string;
  projectId: string;
  assigneeIdx: number;
  dueDate?: string;
}

const seeds: Seed[] = [
  // TODO
  { code: 'KAN-15', title: 'Handle duplicate or ambiguous patient matches', status: 'TODO', priority: 'HIGH', projectTag: 'PATIENT ACCESS & IDENTITY', sprintTag: 'Sprint-1', phaseTag: 'Phase-0', projectId: 'proj-tower-heights', assigneeIdx: 0, dueDate: '2026-06-04' },
  { code: 'KAN-44', title: 'API-based status updates to Soliton — cancel and reschedule flags', status: 'TODO', priority: 'MEDIUM', projectTag: 'INTEGRATION - SOLITON RIS', sprintTag: 'Sprint-1', phaseTag: 'Phase-0', projectId: 'proj-tower-heights', assigneeIdx: 1, dueDate: '2026-06-11' },
  { code: 'KAN-56', title: 'Audit logging — user and system actions', status: 'TODO', priority: 'MEDIUM', projectTag: 'SECURITY & COMPLIANCE', sprintTag: 'Sprint-1', phaseTag: 'Phase-0', projectId: 'proj-riverside-tower', assigneeIdx: 2 },
  { code: 'KAN-55', title: 'Role-based access control — staff portal', status: 'TODO', priority: 'HIGH', projectTag: 'SECURITY & COMPLIANCE', sprintTag: 'Sprint-1', phaseTag: 'Phase-0', projectId: 'proj-riverside-tower', assigneeIdx: 3 },
  { code: 'KAN-72', title: 'Email opt-out and consent capture for marketing', status: 'TODO', priority: 'LOW', projectTag: 'NOTIFICATIONS & MESSAGING', sprintTag: 'Sprint-2', projectId: 'proj-tower-heights', assigneeIdx: 4 },

  // IN_PREPARATION
  { code: 'KAN-30', title: 'Define ingest schema for daily appointment extracts', status: 'IN_PREPARATION', priority: 'HIGH', projectTag: 'INTEGRATION - SOLITON RIS', sprintTag: 'Sprint-1', phaseTag: 'Phase-0', projectId: 'proj-tower-heights', assigneeIdx: 1 },
  { code: 'KAN-31', title: 'Spec review for patient confirmation SMS templates', status: 'IN_PREPARATION', priority: 'MEDIUM', projectTag: 'NOTIFICATIONS & MESSAGING', sprintTag: 'Sprint-2', projectId: 'proj-riverside-tower', assigneeIdx: 2, dueDate: '2026-06-18' },
  { code: 'KAN-33', title: 'Draft retention policy for archived appointments', status: 'IN_PREPARATION', priority: 'LOW', projectTag: 'SECURITY & COMPLIANCE', phaseTag: 'Phase-0', projectId: 'proj-tower-heights', assigneeIdx: 5 },
  { code: 'KAN-34', title: 'Wireframe — appointment reschedule modal', status: 'IN_PREPARATION', priority: 'MEDIUM', projectTag: 'VISIT ORCHESTRATION', sprintTag: 'Sprint-2', projectId: 'proj-riverside-tower', assigneeIdx: 0 },

  // IN_PROGRESS
  { code: 'KAN-80', title: 'Patient portal: reschedule request form for grouped appointments', status: 'IN_PROGRESS', priority: 'HIGH', projectTag: 'VISIT ORCHESTRATION', projectId: 'proj-tower-heights', assigneeIdx: 1, dueDate: '2026-05-29' },
  { code: 'KAN-42', title: 'Daily data extract ingestion — appointments', status: 'IN_PROGRESS', priority: 'CRITICAL', projectTag: 'INTEGRATION - SOLITON RIS', sprintTag: 'MVP-done', projectId: 'proj-tower-heights', assigneeIdx: 3, dueDate: '2026-05-22' },
  { code: 'KAN-43', title: 'Daily data extract ingestion — patients', status: 'IN_PROGRESS', priority: 'HIGH', projectTag: 'INTEGRATION - SOLITON RIS', sprintTag: 'MVP-done', projectId: 'proj-tower-heights', assigneeIdx: 3 },
  { code: 'KAN-45', title: 'Data mapping — appointments patient fields and statuses', status: 'IN_PROGRESS', priority: 'CRITICAL', projectTag: 'INTEGRATION - SOLITON RIS', sprintTag: 'Sprint-1', phaseTag: 'Phase-0', projectId: 'proj-riverside-tower', assigneeIdx: 4 },
  { code: 'KAN-65', title: 'Phone number normalisation and validation at ingestion', status: 'IN_PROGRESS', priority: 'MEDIUM', projectTag: 'INTEGRATION - SOLITON RIS', phaseTag: 'Phase-0', projectId: 'proj-riverside-tower', assigneeIdx: 5 },

  // REVIEW
  { code: 'KAN-14', title: 'Session management and expiry', status: 'REVIEW', priority: 'HIGH', projectTag: 'PATIENT ACCESS & IDENTITY', sprintTag: 'MVP-done', projectId: 'proj-tower-heights', assigneeIdx: 0 },
  { code: 'KAN-20', title: 'Request-based rescheduling — patient submits request', status: 'REVIEW', priority: 'HIGH', projectTag: 'APPOINTMENT MANAGEMENT', sprintTag: 'MVP-done', projectId: 'proj-riverside-tower', assigneeIdx: 2 },
  { code: 'KAN-21', title: 'Capture reschedule reason and notes', status: 'REVIEW', priority: 'MEDIUM', projectTag: 'APPOINTMENT MANAGEMENT', phaseTag: 'Phase-0', projectId: 'proj-tower-heights', assigneeIdx: 1 },
  { code: 'KAN-24', title: 'Real-time slot booking into Soliton', status: 'REVIEW', priority: 'CRITICAL', projectTag: 'APPOINTMENT MANAGEMENT', phaseTag: 'Phase-1', projectId: 'proj-tower-heights', assigneeIdx: 3, dueDate: '2026-05-26' },
  { code: 'KAN-25', title: 'Slot availability retrieval from Soliton', status: 'REVIEW', priority: 'HIGH', projectTag: 'APPOINTMENT MANAGEMENT', phaseTag: 'Phase-1', projectId: 'proj-riverside-tower', assigneeIdx: 4 },
];

export const mockBoardTasks: MockBoardTask[] = seeds.map((s) => {
  const a = assignees[s.assigneeIdx];
  return {
    id: s.code,
    title: s.title,
    description: null,
    status: s.status,
    priority: s.priority,
    projectId: s.projectId,
    assignedToId: a.id,
    dueDate: s.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    assignedTo: a,
    code: s.code,
    projectTag: s.projectTag,
    phaseTag: s.phaseTag,
    sprintTag: s.sprintTag,
  };
});
