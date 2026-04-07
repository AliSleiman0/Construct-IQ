/**
 * One-time fix script: provision standard roles for every organization that
 * was created before the automatic role-provisioning code was in place.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json prisma/fix-org-roles.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STANDARD_ROLES: Array<{ name: string; description: string; permissions: string[] }> = [
  {
    name: 'Admin',
    description: 'Full control within own organization',
    permissions: [
      'read:organizations', 'update:organizations',
      'manage:users', 'manage:roles',
      'manage:projects', 'assign:project_members',
      'manage:phases', 'manage:milestones',
      'manage:tasks', 'assign:tasks',
      'manage:reports',
      'manage:issues', 'assign:issues',
      'manage:budget',
      'manage:suppliers',
      'manage:purchase_orders', 'approve:purchase_orders',
      'manage:deliveries',
      'manage:documents',
      'read:ai', 'use:ai',
      'read:audit_logs',
    ],
  },
  {
    name: 'Project Manager',
    description: 'Manages assigned projects, team, tasks, and approves POs',
    permissions: [
      'read:organizations',
      'read:users', 'read:roles',
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
  },
  {
    name: 'Site Engineer',
    description: 'Submits daily reports, creates issues, updates assigned tasks',
    permissions: [
      'read:projects', 'read:users',
      'read:tasks', 'update:tasks',
      'create:reports', 'read:reports', 'update:reports',
      'create:issues', 'read:issues', 'update:issues',
      'read:phases', 'read:milestones',
      'read:documents', 'upload:documents',
      'read:ai',
    ],
  },
  {
    name: 'Planning Engineer',
    description: 'Manages phases, milestones, and project schedule',
    permissions: [
      'read:projects', 'read:users',
      'manage:phases', 'manage:milestones',
      'manage:tasks', 'assign:tasks',
      'read:reports', 'read:issues', 'read:budget',
      'read:documents', 'read:ai',
    ],
  },
  {
    name: 'Quantity Surveyor',
    description: 'Owns budget management and cost tracking',
    permissions: [
      'read:projects', 'read:users', 'read:tasks',
      'read:phases', 'read:milestones',
      'read:reports', 'read:issues',
      'manage:budget',
      'read:purchase_orders', 'read:deliveries', 'read:suppliers',
      'read:documents', 'read:ai',
    ],
  },
  {
    name: 'Procurement Officer',
    description: 'Manages suppliers, purchase orders, and deliveries',
    permissions: [
      'read:projects', 'read:users', 'read:tasks', 'read:budget',
      'manage:suppliers',
      'manage:purchase_orders',
      'manage:deliveries', 'update:deliveries',
      'read:documents', 'upload:documents',
      'read:ai',
    ],
  },
  {
    name: 'Finance / Management Viewer',
    description: 'Read-only visibility across projects, budget, and procurement',
    permissions: [
      'read:projects', 'read:tasks',
      'read:phases', 'read:milestones',
      'read:reports', 'read:issues', 'read:budget',
      'read:suppliers', 'read:purchase_orders', 'read:deliveries',
      'read:documents', 'read:ai',
    ],
  },
  {
    name: 'Client Viewer',
    description: 'External client — limited read access to assigned project overview',
    permissions: [
      'read:projects', 'read:milestones',
      'read:issues', 'read:reports', 'read:documents',
    ],
  },
  {
    name: 'Supplier User',
    description: 'External supplier — view own POs and update delivery status',
    permissions: ['read:purchase_orders', 'update:deliveries'],
  },
];

async function main() {
  console.log('🔧 Starting org-roles fix...\n');

  // Load all global permissions once
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, name: true },
  });
  const permMap = new Map(allPermissions.map((p) => [p.name, p.id]));
  console.log(`✅ Loaded ${permMap.size} global permissions`);

  // Find all orgs (skip the seed/platform org — it has Super Admin, not company roles)
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { roles: true, users: true } },
    },
  });

  let orgsFixed = 0;
  let usersFixed = 0;

  for (const org of orgs) {
    const existingRoleNames = await prisma.role.findMany({
      where: { organizationId: org.id },
      select: { name: true },
    });
    const existingNames = new Set(existingRoleNames.map((r) => r.name));

    // Provision any missing standard roles for this org
    let adminRoleId: string | null = null;
    let createdAny = false;

    for (const roleDef of STANDARD_ROLES) {
      if (existingNames.has(roleDef.name)) {
        // Role already exists — just grab its ID if it's Admin
        if (roleDef.name === 'Admin') {
          const existing = await prisma.role.findUnique({
            where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
          });
          adminRoleId = existing?.id ?? null;
        }
        continue;
      }

      const role = await prisma.role.create({
        data: {
          organizationId: org.id,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
      });

      if (roleDef.name === 'Admin') {
        adminRoleId = role.id;
      }

      const permData = roleDef.permissions
        .map((name) => permMap.get(name))
        .filter((id): id is string => id !== undefined)
        .map((permissionId) => ({ roleId: role.id, permissionId }));

      if (permData.length > 0) {
        await prisma.rolePermission.createMany({ data: permData });
      }

      createdAny = true;
      console.log(`  + Created role "${roleDef.name}" for org "${org.name}"`);
    }

    if (createdAny) orgsFixed++;

    // Find users in this org who have NO roles at all → assign Admin
    if (!adminRoleId) continue;

    const usersWithoutRoles = await prisma.user.findMany({
      where: {
        organizationId: org.id,
        deletedAt: null,
        userRoles: { none: {} },
      },
      select: { id: true, email: true },
    });

    for (const user of usersWithoutRoles) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: adminRoleId },
      });
      console.log(`  → Assigned Admin role to ${user.email} in org "${org.name}"`);
      usersFixed++;
    }
  }

  console.log(`\n✅ Done! Fixed ${orgsFixed} org(s), assigned Admin role to ${usersFixed} user(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
