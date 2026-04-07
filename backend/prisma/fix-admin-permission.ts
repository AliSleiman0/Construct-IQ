import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Insert manage:company permission (idempotent)
  await prisma.$executeRaw`
    INSERT INTO permissions (id, name, resource, action, description, "createdAt")
    VALUES (gen_random_uuid(), 'manage:company', 'company', 'manage', 'Full access within own organization', NOW())
    ON CONFLICT (name) DO NOTHING
  `;
  console.log('✅ manage:company permission inserted/verified');

  // 2. Remove all existing permissions from every Admin role
  const deleted = await prisma.$executeRaw`
    DELETE FROM role_permissions
    WHERE "roleId" IN (SELECT id FROM roles WHERE name = 'Admin')
  `;
  console.log(`✅ Removed ${deleted} old Admin role permissions`);

  // 3. Assign manage:company to all Admin roles
  const inserted = await prisma.$executeRaw`
    INSERT INTO role_permissions (id, "roleId", "permissionId")
    SELECT gen_random_uuid(), r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Admin' AND p.name = 'manage:company'
    ON CONFLICT DO NOTHING
  `;
  console.log(`✅ Assigned manage:company to ${inserted} Admin roles`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
