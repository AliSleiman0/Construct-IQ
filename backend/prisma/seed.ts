import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * MongoDB-compatible upsert helpers.
 * Prisma upsert requires transactions (replica set). These use findFirst + create instead.
 */
async function findOrCreate<T>(
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>,
): Promise<T> {
  const existing = await findFn();
  if (existing) return existing;
  return createFn();
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Organization ──────────────────────────────────────────
  const org = await findOrCreate(
    () => prisma.organization.findFirst({ where: { slug: 'constructiq' } }),
    () => prisma.organization.create({
      data: {
        name: 'ConstructIQ',
        slug: 'constructiq',
        email: 'info@constructiq.com',
        isActive: true,
      },
    }),
  );
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ── Permissions ───────────────────────────────────────────
  const permissionDefs = [
    { name: 'manage:all',                 resource: '*',               action: 'manage',  description: 'Full access to everything' },
    { name: 'manage:company',             resource: 'company',         action: 'manage',  description: 'Full access within own organization' },
    { name: 'read:organizations',         resource: 'organizations',   action: 'read',    description: 'View organization details' },
    { name: 'update:organizations',       resource: 'organizations',   action: 'update',  description: 'Update organization settings' },
    { name: 'manage:organizations',       resource: 'organizations',   action: 'manage',  description: 'Full organization management' },
    { name: 'read:users',                 resource: 'users',           action: 'read',    description: 'View users' },
    { name: 'create:users',               resource: 'users',           action: 'create',  description: 'Create users' },
    { name: 'update:users',               resource: 'users',           action: 'update',  description: 'Edit users' },
    { name: 'delete:users',               resource: 'users',           action: 'delete',  description: 'Remove users' },
    { name: 'manage:users',               resource: 'users',           action: 'manage',  description: 'Full user management' },
    { name: 'read:roles',                 resource: 'roles',           action: 'read',    description: 'View roles' },
    { name: 'manage:roles',               resource: 'roles',           action: 'manage',  description: 'Create and assign roles' },
    { name: 'read:projects',              resource: 'projects',        action: 'read',    description: 'View projects' },
    { name: 'create:projects',            resource: 'projects',        action: 'create',  description: 'Create projects' },
    { name: 'update:projects',            resource: 'projects',        action: 'update',  description: 'Edit projects' },
    { name: 'delete:projects',            resource: 'projects',        action: 'delete',  description: 'Delete projects' },
    { name: 'manage:projects',            resource: 'projects',        action: 'manage',  description: 'Full project management' },
    { name: 'assign:project_members',     resource: 'project_members', action: 'assign',  description: 'Add/remove project members' },
    { name: 'read:phases',                resource: 'phases',          action: 'read',    description: 'View phases' },
    { name: 'manage:phases',              resource: 'phases',          action: 'manage',  description: 'Create and edit phases' },
    { name: 'read:milestones',            resource: 'milestones',      action: 'read',    description: 'View milestones' },
    { name: 'manage:milestones',          resource: 'milestones',      action: 'manage',  description: 'Create and edit milestones' },
    { name: 'read:tasks',                 resource: 'tasks',           action: 'read',    description: 'View tasks' },
    { name: 'create:tasks',               resource: 'tasks',           action: 'create',  description: 'Create tasks' },
    { name: 'update:tasks',               resource: 'tasks',           action: 'update',  description: 'Edit tasks' },
    { name: 'delete:tasks',               resource: 'tasks',           action: 'delete',  description: 'Delete tasks' },
    { name: 'assign:tasks',               resource: 'tasks',           action: 'assign',  description: 'Assign tasks to users' },
    { name: 'manage:tasks',               resource: 'tasks',           action: 'manage',  description: 'Full task management' },
    { name: 'read:reports',               resource: 'reports',         action: 'read',    description: 'View daily reports' },
    { name: 'create:reports',             resource: 'reports',         action: 'create',  description: 'Submit daily reports' },
    { name: 'update:reports',             resource: 'reports',         action: 'update',  description: 'Edit daily reports' },
    { name: 'manage:reports',             resource: 'reports',         action: 'manage',  description: 'Full report management' },
    { name: 'read:issues',                resource: 'issues',          action: 'read',    description: 'View issues' },
    { name: 'create:issues',              resource: 'issues',          action: 'create',  description: 'Create issues' },
    { name: 'update:issues',              resource: 'issues',          action: 'update',  description: 'Edit issues' },
    { name: 'assign:issues',              resource: 'issues',          action: 'assign',  description: 'Assign issues to users' },
    { name: 'manage:issues',              resource: 'issues',          action: 'manage',  description: 'Full issue management' },
    { name: 'read:budget',                resource: 'budget',          action: 'read',    description: 'View budget' },
    { name: 'manage:budget',              resource: 'budget',          action: 'manage',  description: 'Full budget management' },
    { name: 'read:suppliers',             resource: 'suppliers',       action: 'read',    description: 'View suppliers' },
    { name: 'manage:suppliers',           resource: 'suppliers',       action: 'manage',  description: 'Full supplier management' },
    { name: 'read:purchase_orders',       resource: 'purchase_orders', action: 'read',    description: 'View purchase orders' },
    { name: 'create:purchase_orders',     resource: 'purchase_orders', action: 'create',  description: 'Create purchase orders' },
    { name: 'update:purchase_orders',     resource: 'purchase_orders', action: 'update',  description: 'Edit purchase orders' },
    { name: 'approve:purchase_orders',    resource: 'purchase_orders', action: 'approve', description: 'Approve/reject purchase orders' },
    { name: 'manage:purchase_orders',     resource: 'purchase_orders', action: 'manage',  description: 'Full purchase order management' },
    { name: 'read:deliveries',            resource: 'deliveries',      action: 'read',    description: 'View deliveries' },
    { name: 'update:deliveries',          resource: 'deliveries',      action: 'update',  description: 'Update delivery status' },
    { name: 'manage:deliveries',          resource: 'deliveries',      action: 'manage',  description: 'Full delivery management' },
    { name: 'read:documents',             resource: 'documents',       action: 'read',    description: 'View documents' },
    { name: 'upload:documents',           resource: 'documents',       action: 'upload',  description: 'Upload documents' },
    { name: 'delete:documents',           resource: 'documents',       action: 'delete',  description: 'Delete documents' },
    { name: 'manage:documents',           resource: 'documents',       action: 'manage',  description: 'Full document management' },
    { name: 'read:ai',                    resource: 'ai',              action: 'read',    description: 'View AI insights and summaries' },
    { name: 'use:ai',                     resource: 'ai',              action: 'use',     description: 'Use AI assistant and generate summaries' },
    { name: 'read:audit_logs',            resource: 'audit_logs',      action: 'read',    description: 'View audit logs' },
    { name: 'read:support_tickets',       resource: 'support_tickets', action: 'read',    description: 'View support tickets' },
    { name: 'create:support_tickets',     resource: 'support_tickets', action: 'create',  description: 'Create support tickets' },
    { name: 'update:support_tickets',     resource: 'support_tickets', action: 'update',  description: 'Update support tickets' },
    { name: 'manage:support_tickets',     resource: 'support_tickets', action: 'manage',  description: 'Full support ticket management' },
    { name: 'read:settings',              resource: 'settings',        action: 'read',    description: 'View organization settings' },
    { name: 'update:settings',            resource: 'settings',        action: 'update',  description: 'Update organization settings' },
    { name: 'manage:settings',            resource: 'settings',        action: 'manage',  description: 'Full settings management' },
    { name: 'read:dashboard',             resource: 'dashboard',       action: 'read',    description: 'View organization dashboard' },
  ];

  const permissions = await Promise.all(
    permissionDefs.map((p) =>
      findOrCreate(
        () => prisma.permission.findFirst({ where: { name: p.name } }),
        () => prisma.permission.create({ data: p }),
      ),
    ),
  );
  console.log(`✅ Permissions: ${permissions.length} created/verified`);

  const perm = (name: string) => {
    const p = permissions.find((x) => x.name === name);
    if (!p) throw new Error(`Permission not found: ${name}`);
    return p;
  };

  // ── Roles ─────────────────────────────────────────────────
  const roleDefs = [
    { name: 'Super Admin',                 description: 'Platform-wide administrator — manages all organizations' },
    { name: 'Admin',                        description: 'Full control within own organization' },
    { name: 'Project Manager',             description: 'Manages assigned projects, team, tasks, and approves POs' },
    { name: 'Site Engineer',               description: 'Submits daily reports, creates issues, updates assigned tasks' },
    { name: 'Planning Engineer',           description: 'Manages phases, milestones, and project schedule' },
    { name: 'Quantity Surveyor',           description: 'Owns budget management and cost tracking' },
    { name: 'Procurement Officer',         description: 'Manages suppliers, purchase orders, and deliveries' },
    { name: 'Finance / Management Viewer', description: 'Read-only visibility across projects, budget, and procurement' },
    { name: 'Client Viewer',              description: 'External client — limited read access to assigned project overview' },
    { name: 'Supplier User',              description: 'External supplier — view own POs and update delivery status' },
  ];

  const roles: Record<string, { id: string; name: string }> = {};
  for (const def of roleDefs) {
    const role = await findOrCreate(
      () => prisma.role.findFirst({ where: { organizationId: org.id, name: def.name } }),
      () => prisma.role.create({ data: { organizationId: org.id, name: def.name, description: def.description, isSystem: true } }),
    );
    roles[def.name] = role;
  }
  console.log(`✅ Roles: ${Object.keys(roles).length} created/verified`);

  // ── Role Permission Assignments ───────────────────────────
  const rolePermissionMap: Record<string, string[]> = {
    'Super Admin': ['manage:all'],
    'Admin': ['manage:company'],
    'Project Manager': [
      'read:organizations', 'read:users', 'read:roles',
      'manage:projects', 'assign:project_members',
      'manage:phases', 'manage:milestones',
      'manage:tasks', 'assign:tasks',
      'manage:reports',
      'manage:issues', 'assign:issues',
      'read:budget', 'update:projects',
      'read:suppliers',
      'read:purchase_orders', 'approve:purchase_orders',
      'read:deliveries',
      'manage:documents',
      'read:ai', 'use:ai',
      'read:dashboard',
      'read:support_tickets', 'create:support_tickets',
    ],
    'Site Engineer': [
      'read:projects', 'read:users',
      'read:tasks', 'update:tasks',
      'create:reports', 'read:reports', 'update:reports',
      'create:issues', 'read:issues', 'update:issues',
      'read:phases', 'read:milestones',
      'read:documents', 'upload:documents',
      'read:ai',
    ],
    'Planning Engineer': [
      'read:projects', 'read:users',
      'manage:phases', 'manage:milestones',
      'manage:tasks', 'assign:tasks',
      'read:reports', 'read:issues', 'read:budget',
      'read:documents', 'read:ai',
    ],
    'Quantity Surveyor': [
      'read:projects', 'read:users', 'read:tasks',
      'read:phases', 'read:milestones',
      'read:reports', 'read:issues',
      'manage:budget',
      'read:purchase_orders', 'read:deliveries', 'read:suppliers',
      'read:documents', 'read:ai',
    ],
    'Procurement Officer': [
      'read:projects', 'read:users', 'read:tasks', 'read:budget',
      'manage:suppliers',
      'manage:purchase_orders', 'update:deliveries', 'manage:deliveries',
      'read:documents', 'upload:documents',
      'read:ai',
    ],
    'Finance / Management Viewer': [
      'read:projects', 'read:tasks',
      'read:phases', 'read:milestones',
      'read:reports', 'read:issues', 'read:budget',
      'read:suppliers', 'read:purchase_orders', 'read:deliveries',
      'read:documents', 'read:ai',
    ],
    'Client Viewer': [
      'read:projects', 'read:milestones', 'read:issues',
      'read:reports', 'read:documents',
    ],
    'Supplier User': ['read:purchase_orders', 'update:deliveries'],
  };

  let totalAssigned = 0;
  for (const [roleName, permNames] of Object.entries(rolePermissionMap)) {
    const role = roles[roleName];
    if (!role) continue;
    for (const permName of permNames) {
      const permission = perm(permName);
      await findOrCreate(
        () => prisma.rolePermission.findFirst({ where: { roleId: role.id, permissionId: permission.id } }),
        () => prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } }),
      );
      totalAssigned++;
    }
  }
  console.log(`✅ Role permissions: ${totalAssigned} assignments created/verified`);

  // ── Admin User ────────────────────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@constructiq.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@1234';
  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  async function findOrCreateUser(data: {
    email: string; organizationId: string; passwordHash: string; firstName: string; lastName: string;
  }) {
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) return existing;
    return prisma.user.create({ data: { ...data, status: 'ACTIVE', deletedAt: null } });
  }

  const adminUser = await findOrCreateUser({
    organizationId: org.id,
    email: superAdminEmail,
    passwordHash,
    firstName: 'System',
    lastName: 'Admin',
  });

  await findOrCreate(
    () => prisma.userRole.findFirst({ where: { userId: adminUser.id, roleId: roles['Super Admin'].id } }),
    () => prisma.userRole.create({ data: { userId: adminUser.id, roleId: roles['Super Admin'].id } }),
  );
  console.log(`✅ Admin user: ${adminUser.email} → Super Admin`);

  // ── Demo Users ────────────────────────────────────────────
  const demoUsers = [
    { email: 'orgadmin@constructiq.com',    firstName: 'Org',         lastName: 'Admin',    role: 'Admin' },
    { email: 'pm@constructiq.com',          firstName: 'Project',     lastName: 'Manager',  role: 'Project Manager' },
    { email: 'engineer@constructiq.com',    firstName: 'Site',        lastName: 'Engineer', role: 'Site Engineer' },
    { email: 'planning@constructiq.com',    firstName: 'Planning',    lastName: 'Engineer', role: 'Planning Engineer' },
    { email: 'qs@constructiq.com',          firstName: 'Quantity',    lastName: 'Surveyor', role: 'Quantity Surveyor' },
    { email: 'procurement@constructiq.com', firstName: 'Procurement', lastName: 'Officer',  role: 'Procurement Officer' },
    { email: 'finance@constructiq.com',     firstName: 'Finance',     lastName: 'Viewer',   role: 'Finance / Management Viewer' },
    { email: 'client@constructiq.com',      firstName: 'Client',      lastName: 'Viewer',   role: 'Client Viewer' },
  ];

  for (const u of demoUsers) {
    const hash = await bcrypt.hash('Demo@1234', 12);
    const user = await findOrCreateUser({
      organizationId: org.id,
      email: u.email,
      passwordHash: hash,
      firstName: u.firstName,
      lastName: u.lastName,
    });
    const role = roles[u.role];
    if (role) {
      await findOrCreate(
        () => prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } }),
        () => prisma.userRole.create({ data: { userId: user.id, roleId: role.id } }),
      );
    }
  }
  console.log(`✅ Demo users: ${demoUsers.length} created/verified`);

  // ── Org Settings ──────────────────────────────────────────
  await findOrCreate(
    () => prisma.orgSettings.findFirst({ where: { organizationId: org.id } }),
    () => prisma.orgSettings.create({
      data: {
        organizationId: org.id,
        brandColor: '#1976d2',
        theme: 'light',
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        weekStart: 'monday',
        measurement: 'imperial',
        notifications: {
          emailDigest: 'daily',
          newIssue: true,
          dailyReportSubmitted: true,
          budgetAlert: true,
          projectStatusChange: true,
          newMember: true,
          poApproval: true,
          deliveryUpdate: true,
        },
      },
    }),
  );
  console.log(`✅ Org settings: created/verified`);

  // ── Sample Support Tickets ────────────────────────────────
  const orgAdminUser = await prisma.user.findFirst({
    where: { email: 'orgadmin@constructiq.com' },
  });

  if (orgAdminUser) {
    const ticketCount = await prisma.supportTicket.count({
      where: { organizationId: org.id },
    });

    if (ticketCount === 0) {
      const tickets = [
        {
          organizationId: org.id,
          createdById: orgAdminUser.id,
          subject: 'Cannot export daily reports to PDF',
          description: 'When I try to export daily reports from the BRG-104 project, the PDF generation fails with a timeout error.',
          category: 'TECHNICAL' as const,
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
        },
        {
          organizationId: org.id,
          createdById: orgAdminUser.id,
          subject: 'Request: Gantt chart view for phases',
          description: 'It would be great to have a Gantt chart visualization for project phases and milestones.',
          category: 'FEATURE_REQUEST' as const,
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
        },
        {
          organizationId: org.id,
          createdById: orgAdminUser.id,
          subject: 'Billing address update',
          description: 'Please update our billing address to 456 New Office Blvd, Suite 200.',
          category: 'BILLING' as const,
          priority: 'LOW' as const,
          status: 'RESOLVED' as const,
          resolvedAt: new Date(),
        },
      ];

      for (const t of tickets) {
        await prisma.supportTicket.create({ data: t });
      }
      console.log(`✅ Sample tickets: ${tickets.length} created`);
    }
  }

  console.log(`\n🎉 Seed complete!\n`);
  console.log(`  Login URL  : http://localhost:3000/login`);
  console.log(`  Credentials:`);
  console.log(`    admin@constructiq.com      / Admin@1234  (Super Admin)`);
  console.log(`    orgadmin@constructiq.com   / Demo@1234   (Organization Admin)`);
  console.log(`    pm@constructiq.com         / Demo@1234   (Project Manager)`);
  console.log(`    engineer@constructiq.com   / Demo@1234   (Site Engineer)`);
  console.log(`    planning@constructiq.com   / Demo@1234   (Planning Engineer)`);
  console.log(`    qs@constructiq.com         / Demo@1234   (Quantity Surveyor)`);
  console.log(`    procurement@constructiq.com/ Demo@1234   (Procurement Officer)`);
  console.log(`    finance@constructiq.com    / Demo@1234   (Finance Viewer)`);
  console.log(`    client@constructiq.com     / Demo@1234   (Client Viewer)`);
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
