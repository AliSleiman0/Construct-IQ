export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED';

export interface MockIssue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  location: string;
  trade: string;
  projectId: string;
  projectName: string;
  reporterId: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface MockIssueComment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

const PROJECT = { id: 'proj-tower-heights', name: 'Tower Heights' };
const SITE_ENG = { id: 'user-site-eng', name: 'Sebastian Diaz' };
const PM = { id: 'user-pm', name: 'Pete Williams' };

const SEED: Omit<MockIssue, 'id' | 'projectId' | 'projectName' | 'createdAt' | 'updatedAt' | 'resolvedAt'>[] = [
  {
    title: 'Concrete cover insufficient — Floor 9 Beam B-12',
    description: 'Random rebar inspection found ~2cm cover where 3.5cm required. Beam needs re-tying before tomorrow\'s pour.',
    severity: 'HIGH',
    status: 'IN_REVIEW',
    location: 'Floor 9 · Beam B-12',
    trade: 'Concrete',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
  {
    title: 'Rebar inspection missed — Zone 4',
    description: 'Inspector did not arrive for Zone 4 sign-off. Pour is scheduled for 7am.',
    severity: 'CRITICAL',
    status: 'OPEN',
    location: 'Floor 11 · Zone 4',
    trade: 'Concrete',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: null,
    assigneeName: null,
  },
  {
    title: 'Subcontractor no-show — Electrical',
    description: 'Electrical sub crew did not arrive for the scheduled rough-in window. Schedule slip 1 day.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    location: 'Floor 8 · MEP rough-in',
    trade: 'Electrical',
    reporterId: PM.id,
    reporterName: PM.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
  {
    title: 'Curtain wall panel chipped during lift',
    description: 'Panel #CW-204 has corner chip from lift. Manufacturer notified — replacement in 5 days.',
    severity: 'LOW',
    status: 'IN_REVIEW',
    location: 'Floor 7 · East elevation',
    trade: 'Curtain Wall',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
  {
    title: 'Hot work permit not posted',
    description: 'Welding underway in mechanical room without posted hot work permit. Halted pending paperwork.',
    severity: 'HIGH',
    status: 'RESOLVED',
    location: 'Mechanical Room — Floor 7',
    trade: 'Steel',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: SITE_ENG.id,
    assigneeName: SITE_ENG.name,
  },
  {
    title: 'Slip hazard — water pooling in stair tower',
    description: 'Recent rain has caused water to pool at stair landing. Drainage needs investigation.',
    severity: 'MEDIUM',
    status: 'OPEN',
    location: 'Stair Tower B — Landing 4',
    trade: 'Concrete',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: null,
    assigneeName: null,
  },
  {
    title: 'PPE non-compliance — visiting trade',
    description: 'Two workers from MEP sub seen without hard hats in active lift zone. Site briefing required.',
    severity: 'HIGH',
    status: 'RESOLVED',
    location: 'Active lift zone — North side',
    trade: 'MEP',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
  {
    title: 'Crane wire-rope wear at threshold',
    description: 'Tower crane wire rope shows wear approaching replacement threshold. Inspect before next lift.',
    severity: 'HIGH',
    status: 'IN_REVIEW',
    location: 'Tower Crane #1',
    trade: 'Crane',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
  {
    title: 'Wrong rebar size delivered',
    description: 'Delivery received #5 bar where #6 was specified for floor 11 deck. Returning shipment.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    location: 'Lay-down area — Floor 11',
    trade: 'Concrete',
    reporterId: PM.id,
    reporterName: PM.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
  {
    title: 'Dust complaint from neighbor',
    description: 'Adjacent building reported dust. Increased water spraying schedule and re-secured silt fencing.',
    severity: 'LOW',
    status: 'RESOLVED',
    location: 'East boundary',
    trade: 'Site',
    reporterId: PM.id,
    reporterName: PM.name,
    assigneeId: SITE_ENG.id,
    assigneeName: SITE_ENG.name,
  },
  {
    title: 'Generator fuel leak — minor',
    description: 'Fuel weep observed under 250 kVA generator. Spill kit deployed; repair scheduled tomorrow.',
    severity: 'MEDIUM',
    status: 'IN_REVIEW',
    location: 'Generator pad',
    trade: 'MEP',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: SITE_ENG.id,
    assigneeName: SITE_ENG.name,
  },
  {
    title: 'Embed plate misaligned — Floor 10',
    description: 'Two embeds for curtain wall anchors are 3cm off. Engineer evaluating field fix or replacement.',
    severity: 'HIGH',
    status: 'OPEN',
    location: 'Floor 10 · Slab edge',
    trade: 'Concrete',
    reporterId: SITE_ENG.id,
    reporterName: SITE_ENG.name,
    assigneeId: PM.id,
    assigneeName: PM.name,
  },
];

const buildIssues = (): MockIssue[] => {
  const baseDate = new Date('2026-04-12T07:00:00.000Z').getTime();
  return SEED.map((s, i) => {
    const created = new Date(baseDate + i * 36 * 3600 * 1000).toISOString();
    const updated = new Date(baseDate + i * 36 * 3600 * 1000 + 4 * 3600 * 1000).toISOString();
    const resolvedAt = s.status === 'RESOLVED' ? updated : null;
    return {
      ...s,
      id: `ISS-${String(2001 + i)}`,
      projectId: PROJECT.id,
      projectName: PROJECT.name,
      createdAt: created,
      updatedAt: updated,
      resolvedAt,
    };
  });
};

export const mockIssues: MockIssue[] = buildIssues();

export const mockIssueComments: MockIssueComment[] = [
  {
    id: 'ISS-2001-c-1',
    issueId: 'ISS-2001',
    authorId: PM.id,
    authorName: PM.name,
    body: 'Walked the floor with the foreman — re-tying scheduled overnight. Engineer will spot-check at 6am.',
    createdAt: '2026-04-12T15:00:00.000Z',
  },
  {
    id: 'ISS-2002-c-1',
    issueId: 'ISS-2002',
    authorId: SITE_ENG.id,
    authorName: SITE_ENG.name,
    body: 'Called inspection desk — they\'re rerouting the inspector. ETA 6:30am.',
    createdAt: '2026-04-13T20:00:00.000Z',
  },
  {
    id: 'ISS-2002-c-2',
    issueId: 'ISS-2002',
    authorId: PM.id,
    authorName: PM.name,
    body: 'Pour delayed by 1 hour to allow inspection. Confirmed with concrete sub.',
    createdAt: '2026-04-13T21:30:00.000Z',
  },
  {
    id: 'ISS-2008-c-1',
    issueId: 'ISS-2008',
    authorId: SITE_ENG.id,
    authorName: SITE_ENG.name,
    body: 'Crane out of service until inspection complete. New rope ordered overnight.',
    createdAt: '2026-04-21T11:30:00.000Z',
  },
  {
    id: 'ISS-2012-c-1',
    issueId: 'ISS-2012',
    authorId: PM.id,
    authorName: PM.name,
    body: 'Engineer recommends grinding and welding new plates. RFI being drafted.',
    createdAt: '2026-04-28T08:30:00.000Z',
  },
];
