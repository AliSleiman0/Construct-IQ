// Plugin registration MUST happen before any schema is constructed.
import '../src/database/mongoose/init';

import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';

import { RoleSchema } from '../src/modules/users/schemas/role.schema';
import { PermissionSchema } from '../src/modules/users/schemas/permission.schema';
import { PERMISSION_CATALOG } from '../src/common/constants/permissions';
import { STANDARD_ROLES } from '../src/common/constants/standard-roles';

/**
 * Reconcile every existing organization's system roles with the current
 * PERMISSION_CATALOG + STANDARD_ROLES.
 *
 * Role documents are created per-organization at org-creation time, so editing
 * STANDARD_ROLES only affects *new* orgs. Historically each such edit shipped
 * its own throwaway backfill (`backfill-ai-permissions.ts`,
 * `backfill-bid-permissions.ts`) — and the one that was never written is why
 * `inspections` went missing. This script replaces that pattern: run it after
 * any change to either constant and every org converges.
 *
 * What it does:
 *   1. Upserts every PERMISSION_CATALOG row into the global `permissions`
 *      collection. This matters beyond bookkeeping: OrganizationsService
 *      .create() filters role grants against this collection, so a missing row
 *      silently strips the permission from every future org.
 *   2. Adds any missing STANDARD_ROLES grants to the matching role docs across
 *      all orgs.
 *
 * Additive by default — it never removes a grant, so bespoke permissions an
 * admin added by hand survive. Pass `--prune` to make role docs match
 * STANDARD_ROLES exactly (drops hand-added grants; use when tightening access).
 *
 * Re-running is safe: every write is an upsert or $addToSet.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-role-permissions.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-role-permissions.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-role-permissions.ts --prune
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-role-permissions.ts --roles=PM,SITE_ENG
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

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

function parseRoleFilter(): string[] | null {
  const arg = process.argv.find((a) => a.startsWith('--roles='));
  if (!arg) return null;
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

  const dryRun = hasFlag('--dry-run');
  const prune = hasFlag('--prune');
  const roleFilter = parseRoleFilter();

  await mongoose.connect(url);
  console.log(
    `Connected. Syncing role permissions${dryRun ? ' (DRY RUN — no writes)' : ''}${prune ? ' [prune mode]' : ''}...`,
  );

  const Permission = mongoose.model('Permission', PermissionSchema);
  const Role = mongoose.model('Role', RoleSchema);

  // ── 1. Permission catalog ────────────────────────────────────────────────
  let inserted = 0;
  for (const def of PERMISSION_CATALOG) {
    if (dryRun) {
      const existing = await Permission.findOne({ name: def.name }).lean();
      if (!existing) {
        inserted += 1;
        console.log(`  + would insert permission ${def.name}`);
      }
      continue;
    }
    const result = await Permission.updateOne(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      inserted += 1;
      console.log(`  + inserted permission ${def.name}`);
    }
  }
  console.log(
    `Permissions: ${inserted} new, ${PERMISSION_CATALOG.length - inserted} already present.`,
  );

  // ── 2. Role grants, per org ──────────────────────────────────────────────
  const targets = roleFilter
    ? STANDARD_ROLES.filter((r) => roleFilter.includes(r.name))
    : STANDARD_ROLES;

  if (roleFilter && targets.length !== roleFilter.length) {
    const known = new Set(targets.map((r) => r.name));
    const unknown = roleFilter.filter((r) => !known.has(r));
    console.warn(`  ! not in STANDARD_ROLES, skipped: ${unknown.join(', ')}`);
  }

  let rolesTouched = 0;
  for (const role of targets) {
    const docs = await Role.find({ name: role.name }).lean();
    if (docs.length === 0) {
      console.log(`  - ${role.name}: no role documents found`);
      continue;
    }

    for (const doc of docs) {
      const current: string[] = (doc as any).permissionKeys ?? [];
      const desired = role.permissions;
      const missing = desired.filter((p) => !current.includes(p));
      const extra = prune ? current.filter((p) => !desired.includes(p)) : [];
      if (missing.length === 0 && extra.length === 0) continue;

      rolesTouched += 1;
      const org = (doc as any).organizationId;
      const changes = [
        missing.length ? `+${missing.join(', +')}` : null,
        extra.length ? `-${extra.join(', -')}` : null,
      ]
        .filter(Boolean)
        .join('  ');
      console.log(`  ~ ${role.name} @ org ${org}: ${changes}`);

      if (dryRun) continue;
      await Role.updateOne(
        { _id: (doc as any)._id },
        prune
          ? { $set: { permissionKeys: desired } }
          : { $addToSet: { permissionKeys: { $each: missing } } },
      );
    }
  }

  console.log(
    `Roles: ${rolesTouched} role document(s) ${dryRun ? 'would be' : ''} updated across all orgs.`,
  );
  console.log(dryRun ? 'Dry run complete — nothing written.' : 'Sync complete.');
  console.log(
    'Reminder: the AI assistant additionally needs an org AI plan containing "ai_assistant" (AiFeatureGuard).',
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Sync failed:', err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
