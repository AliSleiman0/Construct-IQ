// Plugin registration MUST happen before any schema is constructed.
import '../src/database/mongoose/init';

import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';

import { OrganizationSchema } from '../src/modules/organizations/schemas/organization.schema';
import { UserSchema } from '../src/modules/users/schemas/user.schema';
import { RoleSchema } from '../src/modules/users/schemas/role.schema';
import { PermissionSchema } from '../src/modules/users/schemas/permission.schema';
import { ProjectSchema } from '../src/modules/projects/schemas/project.schema';
import { OrgSettingsSchema } from '../src/modules/org-settings/schemas/org-settings.schema';
import { TicketSchema } from '../src/modules/tickets/schemas/ticket.schema';
import { PlanSchema } from '../src/modules/plans/schemas/plan.schema';
import { InvoiceSchema } from '../src/modules/billing/schemas/invoice.schema';
import { UserStatus, ProjectStatus, TicketStatus, TicketPriority, TicketCategory, PlanTier, InvoiceStatus } from '../src/common/enums';
import { PERMISSION_CATALOG } from '../src/common/constants/permissions';
import { STANDARD_ROLES } from '../src/common/constants/standard-roles';

function loadDotenv(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotenv();

async function main() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL must be set');

  await mongoose.connect(url);
  console.log('Seeding database...');

  const Organization = mongoose.model('Organization', OrganizationSchema);
  const User = mongoose.model('User', UserSchema);
  const Role = mongoose.model('Role', RoleSchema);
  const Permission = mongoose.model('Permission', PermissionSchema);
  const Project = mongoose.model('Project', ProjectSchema);

  // ── Organizations ─────────────────────────────────────────────────────────
  // Three orgs matching frontend mocks/orgs.mock.ts
  const orgDefs = [
    {
      slug: 'company-a',
      name: 'Company A',
      email: 'contact@companya.com',
      address: '123 Builder Ave, Springfield',
      phone: '+1-555-0101',
      website: 'https://companya.com',
      maxUsers: 50,
      isActive: true,
    },
    {
      slug: 'company-b',
      name: 'Company B',
      email: 'hello@companyb.com',
      address: '456 Concrete Rd, Riverside',
      phone: '+1-555-0202',
      website: 'https://companyb.com',
      maxUsers: 25,
      isActive: true,
    },
    {
      slug: 'company-c',
      name: 'Company C',
      email: 'info@companyc.com',
      address: '789 Steel Blvd, Lakewood',
      phone: '+1-555-0303',
      website: 'https://companyc.com',
      maxUsers: 100,
      isActive: false,
    },
  ];

  const orgs: Record<string, any> = {};
  for (const def of orgDefs) {
    const org = await Organization.findOneAndUpdate(
      { slug: def.slug },
      { $setOnInsert: def },
      { new: true, upsert: true },
    );
    orgs[def.slug] = org;
    console.log(`Organization: ${org.name} (${org._id})`);
  }

  const orgA = orgs['company-a'];
  const orgB = orgs['company-b'];
  const orgC = orgs['company-c'];

  // ── Permissions ───────────────────────────────────────────────────────────
  // Sourced from PERMISSION_CATALOG so this list can never drift from the
  // PERMISSIONS constant. OrganizationsService.create() filters each role's
  // grants against whatever ends up in this collection, so a key missing here
  // is a key silently stripped from every org created through the API.
  const permissionDefs = PERMISSION_CATALOG;

  for (const def of permissionDefs) {
    await Permission.findOneAndUpdate(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true, new: true },
    );
  }
  console.log(`Permissions: ${permissionDefs.length} created/verified`);

  // ── Roles (scoped to Company A — shared by all demo users) ────────────────
  // Tenant roles come straight from STANDARD_ROLES, the same list
  // OrganizationsService.create() provisions for real orgs — so a demo login
  // exercises exactly the grants a paying customer would get. Only the two
  // platform roles are defined here; they are ConstructIQ staff, not tenant
  // staff, and are deliberately absent from STANDARD_ROLES.
  const PLATFORM_ROLES = [
    {
      name: 'SUPER_ADMIN',
      description: 'Platform-wide administrator. Manages all organizations.',
      permissions: ['manage:all'],
    },
    {
      name: 'SUPPORT_AGENT',
      description: 'ConstructIQ staff. Cross-org support and ticket triage.',
      permissions: ['read:organizations', 'read:users', 'read:tickets', 'manage:tickets'],
    },
  ];

  const roleDefs = [...PLATFORM_ROLES, ...STANDARD_ROLES];

  const roles: Record<string, { _id: string; name: string }> = {};
  for (const def of roleDefs) {
    const role = await Role.findOneAndUpdate(
      { organizationId: orgA._id, name: def.name },
      {
        $set: {
          description: def.description,
          isSystem: true,
          permissionKeys: def.permissions,
        },
        $setOnInsert: { organizationId: orgA._id, name: def.name },
      },
      { upsert: true, new: true },
    );
    roles[def.name] = { _id: role._id, name: role.name };
  }
  console.log(`Roles: ${Object.keys(roles).length} created/verified`);

  // ── Users ─────────────────────────────────────────────────────────────────
  async function findOrCreateUser(data: {
    email: string;
    organizationId: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    roleId: string;
    phone?: string;
  }) {
    return User.findOneAndUpdate(
      { email: data.email.toLowerCase() },
      {
        $set: { status: UserStatus.ACTIVE, roleIds: [data.roleId] },
        $setOnInsert: {
          email: data.email.toLowerCase(),
          organizationId: data.organizationId,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
        },
      },
      { upsert: true, new: true },
    );
  }

  const adminHash = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@1234',
    12,
  );
  const demoHash = await bcrypt.hash('Demo@1234', 12);

  // 8 core demo users — emails match the login page DEMO_ACCOUNTS exactly
  const coreUsers = [
    { email: 'admin@constructiq.com',       firstName: 'Anjana',    lastName: 'Patel',    role: 'SUPER_ADMIN',   phone: '+1-555-1001', orgId: orgA._id, hash: adminHash },
    { email: 'support@constructiq.com',     firstName: 'Sam',       lastName: 'Chen',     role: 'SUPPORT_AGENT', phone: '+1-555-1002', orgId: orgA._id, hash: demoHash },
    { email: 'orgadmin@constructiq.com',    firstName: 'Olivia',    lastName: 'Romero',   role: 'ORG_ADMIN',     phone: '+1-555-2001', orgId: orgA._id, hash: demoHash },
    { email: 'pm@constructiq.com',          firstName: 'Pete',      lastName: 'Williams', role: 'PM',            phone: '+1-555-2002', orgId: orgA._id, hash: demoHash },
    { email: 'procurement@constructiq.com', firstName: 'Priya',     lastName: 'Singh',    role: 'PROCUREMENT',   phone: '+1-555-2003', orgId: orgA._id, hash: demoHash },
    { email: 'qs@constructiq.com',          firstName: 'Sara',      lastName: 'Khalil',   role: 'SURVEYOR',      phone: '+1-555-2004', orgId: orgA._id, hash: demoHash },
    { email: 'engineer@constructiq.com',    firstName: 'Sebastian', lastName: 'Diaz',     role: 'SITE_ENG',      phone: '+1-555-2005', orgId: orgA._id, hash: demoHash },
    { email: 'planner@constructiq.com',     firstName: 'Paula',     lastName: 'Nakamura', role: 'PLANNING_ENG',  phone: '+1-555-2006', orgId: orgA._id, hash: demoHash },
    { email: 'finance@constructiq.com',     firstName: 'Farid',     lastName: 'Haddad',   role: 'FINANCE_VIEWER',phone: '+1-555-2007', orgId: orgA._id, hash: demoHash },
    { email: 'client@constructiq.com',      firstName: 'Carlos',    lastName: 'Rivera',   role: 'CLIENT',        phone: '+1-555-3001', orgId: orgA._id, hash: demoHash },
  ];

  const userMap: Record<string, any> = {};
  for (const u of coreUsers) {
    const created = await findOrCreateUser({
      email: u.email,
      organizationId: u.orgId,
      passwordHash: u.hash,
      firstName: u.firstName,
      lastName: u.lastName,
      roleId: roles[u.role]._id,
      phone: u.phone,
    });
    userMap[u.role] = created;
    console.log(`  ${u.email} -> ${u.role}`);
  }

  // Extra users for Company B
  const extraUsersB = [
    { email: 'pm@companyb.com',     firstName: 'James',  lastName: 'Lee',    role: 'PM',       orgId: orgB._id },
    { email: 'eng@companyb.com',    firstName: 'Mia',    lastName: 'Torres', role: 'SITE_ENG', orgId: orgB._id },
    { email: 'client@companyb.com', firstName: 'David',  lastName: 'Kim',    role: 'CLIENT',   orgId: orgB._id },
  ];
  for (const u of extraUsersB) {
    await findOrCreateUser({
      email: u.email,
      organizationId: u.orgId,
      passwordHash: demoHash,
      firstName: u.firstName,
      lastName: u.lastName,
      roleId: roles[u.role]._id,
    });
  }

  // Extra user for Company C
  await findOrCreateUser({
    email: 'admin@companyc.com',
    organizationId: orgC._id,
    passwordHash: demoHash,
    firstName: 'Nina',
    lastName: 'Grant',
    roleId: roles['ORG_ADMIN']._id,
  });

  console.log(`Users: ${coreUsers.length + extraUsersB.length + 1} created/verified`);

  // ── Projects ──────────────────────────────────────────────────────────────
  const pmUser = userMap['PM'];

  const projectDefs = [
    // Company A — 3 projects
    {
      organizationId: orgA._id,
      name: 'Tower Heights',
      code: 'TH-001',
      location: 'Downtown Springfield',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-12-31'),
      totalBudget: 15_000_000,
      currency: 'USD',
      createdById: pmUser?._id ?? null,
    },
    {
      organizationId: orgA._id,
      name: 'Green Valley Residences',
      code: 'GVR-002',
      location: 'Green Valley District',
      status: ProjectStatus.PLANNING,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2027-06-30'),
      totalBudget: 8_500_000,
      currency: 'USD',
      createdById: pmUser?._id ?? null,
    },
    {
      organizationId: orgA._id,
      name: 'Metro Office Complex',
      code: 'MOC-003',
      location: 'Metro Business Park',
      status: ProjectStatus.ON_HOLD,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2027-03-31'),
      totalBudget: 22_000_000,
      currency: 'USD',
      createdById: pmUser?._id ?? null,
    },
    // Company B — 2 projects
    {
      organizationId: orgB._id,
      name: 'Riverside Apartments',
      code: 'RA-001',
      location: 'Riverside',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-10-31'),
      totalBudget: 6_000_000,
      currency: 'USD',
      createdById: null,
    },
    {
      organizationId: orgB._id,
      name: 'Harbor Bridge Renovation',
      code: 'HBR-002',
      location: 'Harbor District',
      status: ProjectStatus.PLANNING,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-01-31'),
      totalBudget: 3_200_000,
      currency: 'USD',
      createdById: null,
    },
    // Company C — 1 project
    {
      organizationId: orgC._id,
      name: 'Lakewood Industrial Park',
      code: 'LIP-001',
      location: 'Lakewood',
      status: ProjectStatus.COMPLETED,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-06-30'),
      totalBudget: 11_000_000,
      currency: 'USD',
      createdById: null,
    },
  ];

  for (const def of projectDefs) {
    const memberList: { userId: string; role: string; joinedAt: Date }[] = [];
    if (def.createdById) {
      memberList.push({ userId: def.createdById.toString(), role: 'Project Manager', joinedAt: new Date() });
    }
    // Ensure org admin is always a member so they can see org projects
    if (userMap['ORG_ADMIN'] && def.organizationId.toString() === orgA._id.toString()) {
      const orgAdminId = userMap['ORG_ADMIN']._id.toString();
      if (!memberList.some((m) => m.userId === orgAdminId)) {
        memberList.push({ userId: orgAdminId, role: 'Admin', joinedAt: new Date() });
      }
    }
    const project = await Project.findOneAndUpdate(
      { organizationId: def.organizationId, name: def.name },
      { $setOnInsert: { ...def, members: memberList } },
      { upsert: true, new: true },
    );
    console.log(`  Project: ${project.name} (${project.status})`);
  }
  console.log(`Projects: ${projectDefs.length} created/verified`);

  // Ensure org admin is a member of all Company A projects (needed for member-scoped queries)
  if (userMap['ORG_ADMIN']) {
    const orgAdminId = userMap['ORG_ADMIN']._id.toString();
    await Project.updateMany(
      { organizationId: orgA._id, 'members.userId': { $ne: orgAdminId } },
      { $addToSet: { members: { userId: orgAdminId, role: 'Admin', joinedAt: new Date() } } },
    );
  }

  // Field roles are project-membership-scoped: list endpoints (issues/reports/
  // tasks) only return data for projects the caller belongs to. Add the demo
  // Site Engineer, Quantity Surveyor, and Procurement officer to all Company A
  // projects so their sections have data to work with.
  for (const [roleKey, memberRole] of [
    ['SITE_ENG', 'Site Engineer'],
    ['SURVEYOR', 'Quantity Surveyor'],
    ['PROCUREMENT', 'Procurement Officer'],
    ['PLANNING_ENG', 'Planning Engineer'],
    ['FINANCE_VIEWER', 'Finance Viewer'],
  ] as const) {
    if (userMap[roleKey]) {
      const memberId = userMap[roleKey]._id.toString();
      await Project.updateMany(
        { organizationId: orgA._id, 'members.userId': { $ne: memberId } },
        { $addToSet: { members: { userId: memberId, role: memberRole, joinedAt: new Date() } } },
      );
    }
  }

  // ── Org Settings ────────────────────────────────────────────────────────
  const OrgSettingsModel = mongoose.model('OrgSettings', OrgSettingsSchema);

  for (const org of [orgA, orgB, orgC]) {
    await OrgSettingsModel.findOneAndUpdate(
      { organizationId: org._id },
      {
        $setOnInsert: {
          organizationId: org._id,
          brandColor: '#1976d2',
          theme: 'auto',
          timezone: 'America/Los_Angeles',
          currency: 'USD',
          dateFormat: 'MMM D, YYYY',
          weekStart: 'monday',
          measurement: 'imperial',
          notifications: {
            projectStatusChange: true,
            budgetAlert: true,
            deliveryUpdate: false,
            newIssue: true,
            emailDigest: 'weekly',
            newMember: false,
            poApproval: true,
          },
          twoFactorRequired: false,
          passwordPolicy: 'standard',
          sessionTimeoutMin: 120,
          ssoEnabled: false,
        },
      },
      { upsert: true, new: true },
    );
  }
  console.log('OrgSettings: 3 created/verified');

  // ── Support Tickets ─────────────────────────────────────────────────────
  // ── Plans ───────────────────────────────────────────────────────────────
  const PlanModel = mongoose.model('Plan', PlanSchema);

  const planDefs = [
    {
      tier: PlanTier.STARTER,
      name: 'Starter',
      pricePerMonth: 29,
      maxUsers: 5,
      maxProjects: 3,
      description: 'For small teams getting started',
      features: ['Up to 5 users', '3 active projects', 'Basic reporting', 'Email support'],
      isPopular: false,
      isActive: true,
    },
    {
      tier: PlanTier.PRO,
      name: 'Pro',
      pricePerMonth: 99,
      maxUsers: 25,
      maxProjects: 20,
      description: 'For growing construction teams',
      features: ['Up to 25 users', '20 active projects', 'Advanced reporting', 'Budget tracking', 'Priority support'],
      isPopular: true,
      isActive: true,
    },
  ];

  const seededPlans: Record<string, any> = {};
  for (const def of planDefs) {
    const plan = await PlanModel.findOneAndUpdate(
      { tier: def.tier },
      { $setOnInsert: def },
      { upsert: true, new: true },
    );
    seededPlans[def.tier] = plan;
  }
  console.log(`Plans: ${planDefs.length} created/verified`);

  // ── Invoices ─────────────────────────────────────────────────────────────
  const InvoiceModel = mongoose.model('Invoice', InvoiceSchema);

  const proPlan = seededPlans[PlanTier.PRO];
  const invoiceDefs = [
    {
      organizationId: orgA._id,
      planId: proPlan._id,
      number: 'INV-2026-0001',
      amountUsd: 99,
      status: InvoiceStatus.PAID,
      issuedAt: new Date('2026-01-01'),
      dueAt: new Date('2026-01-15'),
      paidAt: new Date('2026-01-10'),
    },
    {
      organizationId: orgA._id,
      planId: proPlan._id,
      number: 'INV-2026-0002',
      amountUsd: 99,
      status: InvoiceStatus.PAID,
      issuedAt: new Date('2026-02-01'),
      dueAt: new Date('2026-02-15'),
      paidAt: new Date('2026-02-12'),
    },
    {
      organizationId: orgA._id,
      planId: proPlan._id,
      number: 'INV-2026-0003',
      amountUsd: 99,
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date('2026-03-01'),
      dueAt: new Date('2026-03-15'),
      paidAt: null,
    },
  ];

  for (const def of invoiceDefs) {
    await InvoiceModel.findOneAndUpdate(
      { number: def.number },
      { $setOnInsert: def },
      { upsert: true, new: true },
    );
  }
  console.log(`Invoices: ${invoiceDefs.length} created/verified`);

  const TicketModel = mongoose.model('Ticket', TicketSchema);

  const orgAdminUser = userMap['ORG_ADMIN'];
  const supportUser = userMap['SUPPORT_AGENT'];

  const ticketDefs = [
    {
      organizationId: orgA._id,
      title: 'Cannot upload documents larger than 10 MB',
      body: 'When I try to upload a PDF that is 12 MB, the upload fails with a generic error. The limit should be at least 25 MB per our plan.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      category: TicketCategory.TECHNICAL,
      reporterId: orgAdminUser?._id,
      assigneeId: supportUser?._id ?? null,
    },
    {
      organizationId: orgA._id,
      title: 'Invoice #INV-2026-003 charged twice',
      body: 'Our March invoice was charged to our card twice. Please refund the duplicate charge.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.URGENT,
      category: TicketCategory.BILLING,
      reporterId: orgAdminUser?._id,
      assigneeId: supportUser?._id ?? null,
    },
    {
      organizationId: orgA._id,
      title: 'Request: Gantt chart export to PDF',
      body: 'It would be very helpful if we could export the Gantt chart view to PDF for client presentations.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.LOW,
      category: TicketCategory.FEATURE_REQUEST,
      reporterId: orgAdminUser?._id,
      assigneeId: null,
    },
  ];

  for (const def of ticketDefs) {
    if (!def.reporterId) continue;
    await TicketModel.findOneAndUpdate(
      { organizationId: def.organizationId, title: def.title },
      { $setOnInsert: { ...def, comments: [] } },
      { upsert: true, new: true },
    );
  }
  console.log(`Tickets: ${ticketDefs.length} sample tickets created/verified`);
  console.log('Plans: 2 seeded (Starter, Pro)');

  console.log('\nSeed complete.\n');
  console.log('  Login URL  : http://localhost:3000/login');
  console.log('  ─────────────────────────────────────────────');
  console.log('  admin@constructiq.com       / Admin@1234  (SUPER_ADMIN)');
  console.log('  support@constructiq.com     / Demo@1234   (SUPPORT_AGENT)');
  console.log('  orgadmin@constructiq.com    / Demo@1234   (ORG_ADMIN)');
  console.log('  pm@constructiq.com          / Demo@1234   (PM)');
  console.log('  procurement@constructiq.com / Demo@1234   (PROCUREMENT)');
  console.log('  qs@constructiq.com          / Demo@1234   (SURVEYOR)');
  console.log('  engineer@constructiq.com    / Demo@1234   (SITE_ENG)');
  console.log('  planner@constructiq.com     / Demo@1234   (PLANNING_ENG)');
  console.log('  finance@constructiq.com     / Demo@1234   (FINANCE_VIEWER)');
  console.log('  client@constructiq.com      / Demo@1234   (CLIENT)');
  console.log('  ─────────────────────────────────────────────');
  console.log('  pm@companyb.com            / Demo@1234   (PM — Company B)');
  console.log('  eng@companyb.com           / Demo@1234   (SITE_ENG — Company B)');
  console.log('  client@companyb.com        / Demo@1234   (CLIENT — Company B)');
  console.log('  admin@companyc.com         / Demo@1234   (ORG_ADMIN — Company C)');
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
