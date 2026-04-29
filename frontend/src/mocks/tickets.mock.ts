export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type CommentAuthorKind = 'agent' | 'customer';

export interface MockTicket {
  id: string;
  title: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  orgId: string;
  orgName: string;
  reporterId: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorKind: CommentAuthorKind;
  body: string;
  createdAt: string;
}

const ORGS = [
  { id: 'org-company-a', name: 'Company A' },
  { id: 'org-company-b', name: 'Company B' },
  { id: 'org-company-c', name: 'Company C' },
];

const REPORTERS_BY_ORG: Record<string, { id: string; name: string }[]> = {
  'org-company-a': [
    { id: 'user-org-admin', name: 'Olivia Romero' },
    { id: 'user-pm', name: 'Pete Williams' },
    { id: 'user-site-eng', name: 'Sebastian Diaz' },
    { id: 'user-client', name: 'Carlos Rivera' },
  ],
  'org-company-b': [
    { id: 'rep-b-1', name: 'Marcus Bell' },
    { id: 'rep-b-2', name: 'Aiyana Cole' },
  ],
  'org-company-c': [
    { id: 'rep-c-1', name: 'Lin Tanaka' },
    { id: 'rep-c-2', name: 'Diego Vargas' },
  ],
};

const AGENT = { id: 'user-support-agent', name: 'Sam Chen' };

const TITLES_AND_BODIES: { title: string; body: string }[] = [
  { title: 'Login redirect loop after password reset', body: 'After resetting my password the app redirects me back to /login indefinitely.' },
  { title: 'Daily reports page won\'t load on iPad', body: 'White screen on Safari iPadOS 17.3. Works fine on desktop Chrome.' },
  { title: 'Cannot upload PDF over 10 MB', body: 'Upload fails silently. No error toast — just nothing happens.' },
  { title: 'Project archive button missing', body: 'I\'m an Org Admin and the Archive Project button is gone from the action menu.' },
  { title: 'Wrong currency symbol on invoice', body: 'Invoice shows $ but our company is set to EUR.' },
  { title: 'Push notifications stopped', body: 'No mobile pushes since Tuesday. Settings show enabled.' },
  { title: 'Audit log export takes 30+ minutes', body: 'Trying to export Q1 audit log. Spinner runs forever.' },
  { title: 'Cannot remove deactivated user', body: 'Delete button is disabled even though user is INACTIVE.' },
  { title: 'Gantt bars overlap on phase view', body: 'Gantt bars stack on each other, making the schedule unreadable.' },
  { title: 'Notifications bell shows wrong count', body: 'Badge shows 3 but the dropdown is empty.' },
  { title: 'Issue severity filter resets', body: 'Filter forgets selection when navigating to detail and back.' },
  { title: 'Invite email never arrives', body: 'Invited 4 users yesterday. None received the email. Checked spam.' },
  { title: 'Search by SKU returns no results', body: 'Searching by supplier SKU code returns empty even when SKU is in catalog.' },
  { title: 'Two-factor codes rejected', body: 'My TOTP codes are being rejected. Time on device is correct.' },
  { title: 'Mobile sidebar overlaps content', body: 'Sidebar drawer doesn\'t auto-close after picking a route on phone.' },
  { title: 'Cannot edit phase end date', body: 'Edit modal opens but Save is greyed out even after changing the date.' },
  { title: 'Missing translations for ES locale', body: 'Several form labels show as english strings when locale=es.' },
  { title: 'Documents tab spinner forever', body: 'Documents page loads, then spinner that never resolves.' },
  { title: 'Procurement export missing columns', body: 'CSV export of POs is missing the Supplier column.' },
  { title: 'Budget burn shows 110%', body: 'Burn meter exceeds 100% — should be capped at 100% per spec.' },
  { title: 'Cannot reassign ticket to peer', body: 'Reassign dropdown is empty for my queue mate.' },
  { title: 'Unit gallery filters by floor are missing', body: 'Was there yesterday — gone today.' },
  { title: 'Plan upgrade button does nothing', body: 'Click upgrade — modal flashes then disappears.' },
  { title: 'CSV export uses wrong delimiter', body: 'Excel struggles to import — appears to use semicolons inconsistently.' },
  { title: 'Project Manager cannot invite', body: 'PM role used to be able to invite to project team. Disabled now.' },
  { title: 'Sidebar items briefly all visible after login', body: 'For a half-second I see all admin items before the role-correct sidebar shows.' },
  { title: 'Issue list pagination broken', body: 'Page 2 shows the same items as page 1.' },
  { title: 'Inspections list crashes on tap', body: 'Mobile crashes when opening Inspections.' },
  { title: 'Approve PO requires extra clicks', body: 'Approval flow now needs 4 clicks instead of 1.' },
  { title: 'Document preview rotates random PDFs', body: 'Some PDF previews are rotated 90 degrees randomly.' },
];

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const baseDate = new Date('2026-04-15T08:00:00.000Z').getTime();

const buildTickets = (): MockTicket[] => {
  return TITLES_AND_BODIES.map((tb, i) => {
    const org = ORGS[i % ORGS.length];
    const reporters = REPORTERS_BY_ORG[org.id]!;
    const reporter = reporters[i % reporters.length];
    const status = STATUSES[i % STATUSES.length];
    const priority = PRIORITIES[(i * 3) % PRIORITIES.length];
    const assigned = status !== 'OPEN' && i % 3 !== 2;
    const created = new Date(baseDate + i * 5 * 3600 * 1000).toISOString();
    const updated = new Date(baseDate + (i * 5 + 6) * 3600 * 1000).toISOString();

    return {
      id: `T-${1001 + i}`,
      title: tb.title,
      body: tb.body,
      status,
      priority,
      orgId: org.id,
      orgName: org.name,
      reporterId: reporter.id,
      reporterName: reporter.name,
      assigneeId: assigned ? AGENT.id : null,
      assigneeName: assigned ? AGENT.name : null,
      createdAt: created,
      updatedAt: updated,
    };
  });
};

export const mockTickets: MockTicket[] = buildTickets();

const buildComments = (): MockComment[] => {
  const seeds: { ticketIdx: number; lines: { author: 'agent' | 'customer'; body: string }[] }[] = [
    {
      ticketIdx: 0,
      lines: [
        { author: 'agent', body: 'Thanks for the report — can you tell me which browser and version?' },
        { author: 'customer', body: 'Chrome 124 on macOS 14.4.' },
        { author: 'agent', body: 'Reproduced. Pushing a fix to staging now.' },
      ],
    },
    {
      ticketIdx: 2,
      lines: [
        { author: 'agent', body: 'Have you tried compressing the PDF below 10 MB as a workaround?' },
        { author: 'customer', body: 'That works but it\'s a lot of manual cleanup. Hoping for a real fix.' },
      ],
    },
    {
      ticketIdx: 4,
      lines: [
        { author: 'customer', body: 'Bumping — this is blocking month-end invoicing.' },
        { author: 'agent', body: 'Escalating to engineering. Update by EOD.' },
      ],
    },
    {
      ticketIdx: 7,
      lines: [{ author: 'agent', body: 'I see the user is INACTIVE not DEACTIVATED. Confirming UI label is wrong.' }],
    },
    {
      ticketIdx: 11,
      lines: [
        { author: 'customer', body: 'Same issue here — followed up via email last week, no reply.' },
        { author: 'agent', body: 'Apologies — we\'ll check the queue. Investigating SMTP logs.' },
      ],
    },
    {
      ticketIdx: 19,
      lines: [
        { author: 'agent', body: 'This is a known display bug — the underlying number is correct.' },
        { author: 'customer', body: 'Got it, thanks. We\'ll wait for the fix.' },
      ],
    },
    {
      ticketIdx: 25,
      lines: [{ author: 'customer', body: 'Repro: log in, watch sidebar for 0.5s. All admin items flash.' }],
    },
  ];

  const out: MockComment[] = [];
  for (const s of seeds) {
    const ticket = mockTickets[s.ticketIdx];
    if (!ticket) continue;
    s.lines.forEach((line, idx) => {
      const author =
        line.author === 'agent'
          ? AGENT
          : { id: ticket.reporterId, name: ticket.reporterName };
      out.push({
        id: `${ticket.id}-c-${idx + 1}`,
        ticketId: ticket.id,
        authorId: author.id,
        authorName: author.name,
        authorKind: line.author,
        body: line.body,
        createdAt: new Date(
          new Date(ticket.createdAt).getTime() + (idx + 1) * 3 * 3600 * 1000,
        ).toISOString(),
      });
    });
  }
  return out;
};

export const mockTicketComments: MockComment[] = buildComments();
