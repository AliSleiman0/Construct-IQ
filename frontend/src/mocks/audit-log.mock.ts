export type AuditAction =
  | 'login'
  | 'logout'
  | 'user.create'
  | 'user.deactivate'
  | 'role.assign'
  | 'role.remove'
  | 'project.create'
  | 'project.archive'
  | 'org.create'
  | 'org.suspend'
  | 'plan.upgrade'
  | 'plan.downgrade'
  | 'invoice.paid'
  | 'ticket.create'
  | 'ticket.resolve'
  | 'report.file'
  | 'issue.resolve';

export interface MockAuditEntry {
  id: string;
  action: AuditAction;
  description: string;
  actorName: string;
  orgName: string;
  ipAddress: string;
  createdAt: string;
}

const ACTORS = [
  { name: 'Anjana Patel', org: 'System' },
  { name: 'Sam Chen', org: 'ConstructIQ Staff' },
  { name: 'Olivia Romero', org: 'Company A' },
  { name: 'Pete Williams', org: 'Company A' },
  { name: 'Sebastian Diaz', org: 'Company A' },
  { name: 'Marcus Bell', org: 'Company B' },
  { name: 'Lin Tanaka', org: 'Company C' },
];

const TEMPLATES: { action: AuditAction; description: string }[] = [
  { action: 'login', description: 'Signed in' },
  { action: 'logout', description: 'Signed out' },
  { action: 'user.create', description: 'Invited new user pat@companya.com' },
  { action: 'user.deactivate', description: 'Deactivated user dani@companya.com' },
  { action: 'role.assign', description: 'Granted PROJECT_MANAGER role to pete@companya.com' },
  { action: 'role.remove', description: 'Removed SITE_ENG role from old@companyb.com' },
  { action: 'project.create', description: 'Created project "Riverside Tower"' },
  { action: 'project.archive', description: 'Archived project "Phase II Annex"' },
  { action: 'org.create', description: 'Created organization "Company D"' },
  { action: 'org.suspend', description: 'Suspended organization "Company C"' },
  { action: 'plan.upgrade', description: 'Upgraded plan from Starter to Pro' },
  { action: 'plan.downgrade', description: 'Downgraded plan from Enterprise to Pro' },
  { action: 'invoice.paid', description: 'Marked invoice INV-A-202604 as paid' },
  { action: 'ticket.create', description: 'Filed ticket T-1042 "Login redirect loop"' },
  { action: 'ticket.resolve', description: 'Resolved ticket T-1019 "Invite emails not sending"' },
  { action: 'report.file', description: 'Filed daily report dr-1010 for Tower Heights' },
  { action: 'issue.resolve', description: 'Resolved issue ISS-2007 "PPE non-compliance"' },
];

const buildAudit = (): MockAuditEntry[] => {
  const out: MockAuditEntry[] = [];
  const baseDate = new Date('2026-04-28T09:30:00.000Z').getTime();
  for (let i = 0; i < 50; i += 1) {
    const tpl = TEMPLATES[i % TEMPLATES.length];
    const actor = ACTORS[i % ACTORS.length];
    out.push({
      id: `aud-${10001 + i}`,
      action: tpl.action,
      description: tpl.description,
      actorName: actor.name,
      orgName: actor.org,
      ipAddress: `10.${(i * 11) % 256}.${(i * 7) % 256}.${(i * 19) % 256}`,
      createdAt: new Date(baseDate - i * 47 * 60 * 1000).toISOString(),
    });
  }
  return out;
};

export const mockAuditLog: MockAuditEntry[] = buildAudit();
