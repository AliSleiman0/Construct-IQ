export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'CLOSEOUT' | 'COMPLETED' | 'ON_HOLD';

export interface MockProject {
  id: string;
  name: string;
  code: string;
  orgId: string;
  orgName: string;
  managerName: string;
  status: ProjectStatus;
  budgetUsd: number;
  spentUsd: number;
  startDate: string;
  targetEndDate: string;
  progressPct: number;
}

export const mockProjects: MockProject[] = [
  {
    id: 'proj-tower-heights',
    name: 'Tower Heights',
    code: 'TH-2025',
    orgId: 'org-company-a',
    orgName: 'Company A',
    managerName: 'Pete Williams',
    status: 'IN_PROGRESS',
    budgetUsd: 38_400_000,
    spentUsd: 22_140_000,
    startDate: '2025-09-01',
    targetEndDate: '2027-04-30',
    progressPct: 62,
  },
  {
    id: 'proj-riverside-tower',
    name: 'Riverside Tower',
    code: 'RT-2024',
    orgId: 'org-company-a',
    orgName: 'Company A',
    managerName: 'Pete Williams',
    status: 'IN_PROGRESS',
    budgetUsd: 21_900_000,
    spentUsd: 19_412_000,
    startDate: '2024-04-12',
    targetEndDate: '2026-08-31',
    progressPct: 88,
  },
  {
    id: 'proj-phase-ii-annex',
    name: 'Phase II Annex',
    code: 'PA-2026',
    orgId: 'org-company-a',
    orgName: 'Company A',
    managerName: 'Pete Williams',
    status: 'PLANNING',
    budgetUsd: 4_750_000,
    spentUsd: 220_000,
    startDate: '2026-06-01',
    targetEndDate: '2027-02-28',
    progressPct: 4,
  },
  {
    id: 'proj-northgate-mall',
    name: 'Northgate Mall Refit',
    code: 'NM-2025',
    orgId: 'org-company-b',
    orgName: 'Company B',
    managerName: 'Marcus Bell',
    status: 'CLOSEOUT',
    budgetUsd: 8_300_000,
    spentUsd: 7_980_000,
    startDate: '2025-02-15',
    targetEndDate: '2026-05-31',
    progressPct: 96,
  },
  {
    id: 'proj-warehouse-7',
    name: 'Warehouse 7 Build-out',
    code: 'WH7-2026',
    orgId: 'org-company-b',
    orgName: 'Company B',
    managerName: 'Aiyana Cole',
    status: 'IN_PROGRESS',
    budgetUsd: 3_120_000,
    spentUsd: 1_540_000,
    startDate: '2026-01-10',
    targetEndDate: '2026-09-30',
    progressPct: 49,
  },
  {
    id: 'proj-southern-school',
    name: 'Southern District School',
    code: 'SDS-2024',
    orgId: 'org-company-c',
    orgName: 'Company C',
    managerName: 'Lin Tanaka',
    status: 'ON_HOLD',
    budgetUsd: 12_400_000,
    spentUsd: 5_120_000,
    startDate: '2024-08-01',
    targetEndDate: '2026-12-31',
    progressPct: 41,
  },
];

export const projectsForOrg = (orgId: string): MockProject[] =>
  mockProjects.filter((p) => p.orgId === orgId);

export const findProjectById = (id: string): MockProject | undefined =>
  mockProjects.find((p) => p.id === id);
