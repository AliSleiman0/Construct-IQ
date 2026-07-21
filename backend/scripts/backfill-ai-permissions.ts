// Plugin registration MUST happen before any schema is constructed.
import '../src/database/mongoose/init';

import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';

import { RoleSchema } from '../src/modules/users/schemas/role.schema';
import { PermissionSchema } from '../src/modules/users/schemas/permission.schema';

/**
 * Idempotent one-shot backfill: open the AI assistant to every internal staff
 * role.
 *
 * Role docs are created per-organization at org-creation time, so changing
 * STANDARD_ROLES in organizations.service.ts only affects *new* orgs. This
 * script pushes `use:ai` into the role docs that already exist.
 *
 * ORG_ADMIN is intentionally absent — `manage:company` is already a wildcard
 * in both PermissionsGuard and the frontend store. CLIENT / SUPPLIER /
 * SUBCONTRACTOR are intentionally absent — external accounts get no assistant.
 * PLANNING_ENG / FINANCE_VIEWER are absent because they have no UI at all yet.
 *
 * Note the org-level gate still applies independently: an organization with no
 * `aiPlanId`, or a plan lacking `ai_assistant`, gets 403 at AiFeatureGuard no
 * matter what this script grants. Assign AI plans from /super-admin/ai-plans.
 *
 * Re-running is safe: every write is an upsert or $addToSet.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-ai-permissions.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-ai-permissions.ts --roles=PM,SITE_ENG
 */

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

const AI_PERMISSION_DEFS = [
  { name: 'read:ai', resource: 'ai', action: 'read', description: 'View AI insights and summaries' },
  { name: 'use:ai', resource: 'ai', action: 'use', description: 'Use AI assistant and generate summaries' },
];

// Only roles that have a route prefix of their own in
// frontend/src/config/roles.ts. PLANNING_ENG and FINANCE_VIEWER are omitted on
// purpose — they have no UI, so (app)/layout.tsx logs them out before any
// assistant could appear. Add them here when those sections ship.
const DEFAULT_TARGET_ROLES = ['PM', 'PROCUREMENT', 'SURVEYOR', 'SITE_ENG'];

function parseRoleArg(): string[] {
  const arg = process.argv.find((a) => a.startsWith('--roles='));
  if (!arg) return DEFAULT_TARGET_ROLES;
  return arg
    .slice('--roles='.length)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

async function main() {
  loadDotenv();

  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL must be set');

  await mongoose.connect(url);
  console.log('Connected. Running AI-permissions backfill...');

  const Permission = mongoose.model('Permission', PermissionSchema);
  const Role = mongoose.model('Role', RoleSchema);

  // 1. Make sure the permission docs exist (a fresh DB may predate them).
  let permissionsInserted = 0;
  for (const def of AI_PERMISSION_DEFS) {
    const result = await Permission.updateOne(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true },
    );
    if (result.upsertedCount > 0) permissionsInserted += 1;
  }
  console.log(
    `Permissions: ${permissionsInserted} new, ${AI_PERMISSION_DEFS.length - permissionsInserted} already present.`,
  );

  // 2. Push read:ai + use:ai into the target role docs across every org.
  const targetRoles = parseRoleArg();
  const rolesResult = await Role.updateMany(
    { name: { $in: targetRoles } },
    { $addToSet: { permissionKeys: { $each: ['read:ai', 'use:ai'] } } },
  );
  console.log(
    `Roles: matched ${rolesResult.matchedCount}, modified ${rolesResult.modifiedCount} (${targetRoles.join(', ')} across all orgs).`,
  );

  console.log('Backfill complete.');
  console.log(
    'Reminder: each org still needs an AI plan containing "ai_assistant" for the assistant to appear.',
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
