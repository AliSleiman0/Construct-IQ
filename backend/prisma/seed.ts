import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Organization ──────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'constructiq' },
    update: {},
    create: {
      name: 'ConstructIQ',
      slug: 'constructiq',
      email: 'info@constructiq.com',
      isActive: true,
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ── Permissions ───────────────────────────────────────────
  const permissionDefs = [
    { name: 'manage:all',          resource: '*',            action: 'manage',  description: 'Full access to everything' },
    { name: 'read:projects',       resource: 'projects',     action: 'read',    description: 'View projects' },
    { name: 'write:projects',      resource: 'projects',     action: 'write',   description: 'Create/edit projects' },
    { name: 'read:tasks',          resource: 'tasks',        action: 'read',    description: 'View tasks' },
    { name: 'write:tasks',         resource: 'tasks',        action: 'write',   description: 'Create/edit tasks' },
    { name: 'read:reports',        resource: 'reports',      action: 'read',    description: 'View daily reports' },
    { name: 'write:reports',       resource: 'reports',      action: 'write',   description: 'Create/edit daily reports' },
    { name: 'read:budget',         resource: 'budget',       action: 'read',    description: 'View budget' },
    { name: 'write:budget',        resource: 'budget',       action: 'write',   description: 'Edit budget' },
    { name: 'read:documents',      resource: 'documents',    action: 'read',    description: 'View documents' },
    { name: 'write:documents',     resource: 'documents',    action: 'write',   description: 'Upload documents' },
    { name: 'read:users',          resource: 'users',        action: 'read',    description: 'View users' },
    { name: 'write:users',         resource: 'users',        action: 'write',   description: 'Manage users' },
  ];

  const permissions = await Promise.all(
    permissionDefs.map((p) =>
      prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      }),
    ),
  );
  console.log(`✅ Permissions: ${permissions.length} created/verified`);

  // ── Roles ─────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Admin',
      description: 'Full system administrator',
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Project Manager' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Project Manager',
      description: 'Manages projects and teams',
      isSystem: true,
    },
  });

  const engineerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Engineer' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Engineer',
      description: 'Site engineer',
      isSystem: true,
    },
  });

  console.log(`✅ Roles: Admin, Project Manager, Engineer`);

  // Assign all permissions to Admin role
  const adminPermission = permissions.find((p) => p.name === 'manage:all')!;
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: adminPermission.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: adminPermission.id },
  });

  // Manager gets project/task/report/budget/document permissions
  const managerPerms = permissions.filter((p) =>
    ['read:projects','write:projects','read:tasks','write:tasks','read:reports','write:reports','read:budget','read:documents','write:documents','read:users'].includes(p.name),
  );
  await Promise.all(
    managerPerms.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: p.id },
      }),
    ),
  );

  // Engineer gets read/write tasks & reports
  const engineerPerms = permissions.filter((p) =>
    ['read:projects','read:tasks','write:tasks','read:reports','write:reports','read:documents'].includes(p.name),
  );
  await Promise.all(
    engineerPerms.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: engineerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: engineerRole.id, permissionId: p.id },
      }),
    ),
  );

  console.log(`✅ Role permissions assigned`);

  // ── Admin User ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@constructiq.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@constructiq.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Admin user: ${adminUser.email}`);

  // Assign Admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log(`\n🎉 Seed complete!\n`);
  console.log(`  Login URL : http://localhost:3000/login`);
  console.log(`  Email     : admin@constructiq.com`);
  console.log(`  Password  : Admin@1234`);
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
