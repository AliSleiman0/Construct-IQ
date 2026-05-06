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
import { UserStatus, ProjectStatus } from '../src/common/enums';

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
  const permissionDefs = [
    { name: 'manage:all', resource: '*', action: 'manage', description: 'Full access to everything' },
    { name: 'manage:company', resource: 'company', action: 'manage', description: 'Full access within own organization' },
    { name: 'read:organizations', resource: 'organizations', action: 'read', description: 'View organization details' },
    { name: 'update:organizations', resource: 'organizations', action: 'update', description: 'Update organization settings' },
    { name: 'manage:organizations', resource: 'organizations', action: 'manage', description: 'Full organization management' },
    { name: 'read:users', resource: 'users', action: 'read', description: 'View users' },
    { name: 'create:users', resource: 'users', action: 'create', description: 'Create users' },
    { name: 'update:users', resource: 'users', action: 'update', description: 'Edit users' },
    { name: 'delete:users', resource: 'users', action: 'delete', description: 'Remove users' },
    { name: 'manage:users', resource: 'users', action: 'manage', description: 'Full user management' },
    { name: 'read:roles', resource: 'roles', action: 'read', description: 'View roles' },
    { name: 'manage:roles', resource: 'roles', action: 'manage', description: 'Create and assign roles' },
    { name: 'read:projects', resource: 'projects', action: 'read', description: 'View projects' },
    { name: 'create:projects', resource: 'projects', action: 'create', description: 'Create projects' },
    { name: 'update:projects', resource: 'projects', action: 'update', description: 'Edit projects' },
    { name: 'delete:projects', resource: 'projects', action: 'delete', description: 'Delete projects' },
    { name: 'manage:projects', resource: 'projects', action: 'manage', description: 'Full project management' },
    { name: 'assign:project_members', resource: 'project_members', action: 'assign', description: 'Add/remove project members' },
    { name: 'read:phases', resource: 'phases', action: 'read', description: 'View phases' },
    { name: 'manage:phases', resource: 'phases', action: 'manage', description: 'Create and edit phases' },
    { name: 'read:milestones', resource: 'milestones', action: 'read', description: 'View milestones' },
    { name: 'manage:milestones', resource: 'milestones', action: 'manage', description: 'Create and edit milestones' },
    { name: 'read:tasks', resource: 'tasks', action: 'read', description: 'View tasks' },
    { name: 'create:tasks', resource: 'tasks', action: 'create', description: 'Create tasks' },
    { name: 'update:tasks', resource: 'tasks', action: 'update', description: 'Edit tasks' },
    { name: 'delete:tasks', resource: 'tasks', action: 'delete', description: 'Delete tasks' },
    { name: 'assign:tasks', resource: 'tasks', action: 'assign', description: 'Assign tasks to users' },
    { name: 'manage:tasks', resource: 'tasks', action: 'manage', description: 'Full task management' },
    { name: 'read:reports', resource: 'reports', action: 'read', description: 'View daily reports' },
    { name: 'create:reports', resource: 'reports', action: 'create', description: 'Submit daily reports' },
    { name: 'update:reports', resource: 'reports', action: 'update', description: 'Edit daily reports' },
    { name: 'manage:reports', resource: 'reports', action: 'manage', description: 'Full report management' },
    { name: 'read:issues', resource: 'issues', action: 'read', description: 'View issues' },
    { name: 'create:issues', resource: 'issues', action: 'create', description: 'Create issues' },
    { name: 'update:issues', resource: 'issues', action: 'update', description: 'Edit issues' },
    { name: 'assign:issues', resource: 'issues', action: 'assign', description: 'Assign issues to users' },
    { name: 'manage:issues', resource: 'issues', action: 'manage', description: 'Full issue management' },
    { name: 'read:budget', resource: 'budget', action: 'read', description: 'View budget' },
    { name: 'manage:budget', resource: 'budget', action: 'manage', description: 'Full budget management' },
    { name: 'read:suppliers', resource: 'suppliers', action: 'read', description: 'View suppliers' },
    { name: 'manage:suppliers', resource: 'suppliers', action: 'manage', description: 'Full supplier management' },
    { name: 'read:purchase_orders', resource: 'purchase_orders', action: 'read', description: 'View purchase orders' },
    { name: 'create:purchase_orders', resource: 'purchase_orders', action: 'create', description: 'Create purchase orders' },
    { name: 'update:purchase_orders', resource: 'purchase_orders', action: 'update', description: 'Edit purchase orders' },
    { name: 'approve:purchase_orders', resource: 'purchase_orders', action: 'approve', description: 'Approve/reject purchase orders' },
    { name: 'manage:purchase_orders', resource: 'purchase_orders', action: 'manage', description: 'Full purchase order management' },
    { name: 'read:deliveries', resource: 'deliveries', action: 'read', description: 'View deliveries' },
    { name: 'update:deliveries', resource: 'deliveries', action: 'update', description: 'Update delivery status' },
    { name: 'manage:deliveries', resource: 'deliveries', action: 'manage', description: 'Full delivery management' },
    { name: 'read:documents', resource: 'documents', action: 'read', description: 'View documents' },
    { name: 'upload:documents', resource: 'documents', action: 'upload', description: 'Upload documents' },
    { name: 'delete:documents', resource: 'documents', action: 'delete', description: 'Delete documents' },
    { name: 'manage:documents', resource: 'documents', action: 'manage', description: 'Full document management' },
    { name: 'read:ai', resource: 'ai', action: 'read', description: 'View AI insights and summaries' },
    { name: 'use:ai', resource: 'ai', action: 'use', description: 'Use AI assistant and generate summaries' },
    { name: 'read:tickets', resource: 'tickets', action: 'read', description: 'View support tickets' },
    { name: 'manage:tickets', resource: 'tickets', action: 'manage', description: 'Triage and resolve support tickets' },
    { name: 'read:audit_logs', resource: 'audit_logs', action: 'read', description: 'View audit logs' },
  ];

  for (const def of permissionDefs) {
    await Permission.findOneAndUpdate(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true, new: true },
    );
  }
  console.log(`Permissions: ${permissionDefs.length} created/verified`);

  // ── Roles (scoped to Company A — shared by all demo users) ────────────────
  const rolePermissionMap: Record<string, string[]> = {
    SUPER_ADMIN: ['manage:all'],
    SUPPORT_AGENT: ['read:organizations', 'read:users', 'read:tickets', 'manage:tickets'],
    ORG_ADMIN: ['manage:company'],
    PM: [
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
    ],
    PROCUREMENT: [
      'read:projects', 'read:users', 'read:tasks', 'read:budget',
      'manage:suppliers', 'manage:purchase_orders', 'update:deliveries', 'manage:deliveries',
      'read:documents', 'upload:documents', 'read:ai',
    ],
    SURVEYOR: [
      'read:projects', 'read:users', 'read:tasks',
      'read:phases', 'read:milestones', 'read:reports', 'read:issues',
      'manage:budget', 'read:purchase_orders', 'read:deliveries', 'read:suppliers',
      'read:documents', 'read:ai',
    ],
    SITE_ENG: [
      'read:projects', 'read:users',
      'read:tasks', 'update:tasks',
      'create:reports', 'read:reports', 'update:reports',
      'create:issues', 'read:issues', 'update:issues',
      'read:phases', 'read:milestones',
      'read:documents', 'upload:documents', 'read:ai',
    ],
    CLIENT: ['read:projects', 'read:milestones', 'read:issues', 'read:reports', 'read:documents'],
  };

  const roleDefs = [
    { name: 'SUPER_ADMIN', description: 'Platform-wide administrator. Manages all organizations.' },
    { name: 'SUPPORT_AGENT', description: 'ConstructIQ staff. Cross-org support and ticket triage.' },
    { name: 'ORG_ADMIN', description: 'Full control within own organization.' },
    { name: 'PM', description: 'Project Manager. Manages assigned projects, team, tasks, and approves POs.' },
    { name: 'PROCUREMENT', description: 'Procurement Officer. Manages suppliers, purchase orders, and deliveries.' },
    { name: 'SURVEYOR', description: 'Quantity Surveyor. Owns budget management and cost tracking.' },
    { name: 'SITE_ENG', description: 'Site Engineer. Submits daily reports, creates issues, updates assigned tasks.' },
    { name: 'CLIENT', description: 'External client. Limited read access to assigned project overview.' },
  ];

  const roles: Record<string, { _id: string; name: string }> = {};
  for (const def of roleDefs) {
    const role = await Role.findOneAndUpdate(
      { organizationId: orgA._id, name: def.name },
      {
        $set: {
          description: def.description,
          isSystem: true,
          permissionKeys: rolePermissionMap[def.name] ?? [],
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
    const project = await Project.findOneAndUpdate(
      { organizationId: def.organizationId, name: def.name },
      {
        $setOnInsert: {
          ...def,
          members: def.createdById
            ? [{ userId: def.createdById.toString(), role: 'Project Manager', joinedAt: new Date() }]
            : [],
        },
      },
      { upsert: true, new: true },
    );
    console.log(`  Project: ${project.name} (${project.status})`);
  }
  console.log(`Projects: ${projectDefs.length} created/verified`);

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
