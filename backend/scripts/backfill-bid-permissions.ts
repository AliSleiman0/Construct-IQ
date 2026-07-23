// Plugin registration MUST happen before any schema is constructed.
import '../src/database/mongoose/init';

import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';

import { RoleSchema } from '../src/modules/users/schemas/role.schema';
import { PermissionSchema } from '../src/modules/users/schemas/permission.schema';
import { AiPlanSchema } from '../src/modules/ai-plans/schemas/ai-plan.schema';
import { AiFeatureSchema } from '../src/modules/ai-features/schemas/ai-feature.schema';
import { AI_FEATURES } from '../src/common/constants/ai-features';

/**
 * Idempotent one-shot backfill for the Subcontractor Bid Analyzer feature.
 *
 * NOTE: steps 1 and 2 are now redundant — `scripts/sync-role-permissions.ts`
 * (npm run sync:roles) reconciles PERMISSION_CATALOG and STANDARD_ROLES for
 * every org generically. They are kept here only so this script stays runnable
 * standalone against an old database. Steps 3 and 4 are unique to this script:
 * nothing else attaches an AI feature key to existing AI plans.
 *
 * Run after deploying the feature to push:
 *   1. New `bids` permission docs into the global `permissions` collection.
 *   2. `manage:bids` into every existing PM and PROCUREMENT role document.
 *   3. The `ai_bid_analysis` AI feature doc into the catalog (also handled by
 *      AiFeaturesService.onModuleInit on startup — re-asserted here for safety).
 *   4. The `ai_bid_analysis` key into every active AI plan with tier ADVANCED
 *      or PRO (override with --tiers=ADVANCED,PRO,ESSENTIALS).
 *
 * Re-running this script is safe: all writes are upserts or $addToSet.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-bid-permissions.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-bid-permissions.ts --tiers=ADVANCED,PRO
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

const BID_PERMISSION_DEFS = [
  { name: 'read:bids', resource: 'bids', action: 'read', description: 'View subcontractor bids' },
  { name: 'create:bids', resource: 'bids', action: 'create', description: 'Upload and analyze bid PDFs' },
  { name: 'update:bids', resource: 'bids', action: 'update', description: 'Edit bid records' },
  { name: 'delete:bids', resource: 'bids', action: 'delete', description: 'Delete bid records' },
  { name: 'manage:bids', resource: 'bids', action: 'manage', description: 'Full subcontractor bid management' },
];

const TARGET_ROLE_NAMES = ['PM', 'PROCUREMENT'];

const DEFAULT_TARGET_TIERS = ['ADVANCED', 'PRO'];

function parseTierArg(): string[] {
  const arg = process.argv.find((a) => a.startsWith('--tiers='));
  if (!arg) return DEFAULT_TARGET_TIERS;
  return arg
    .slice('--tiers='.length)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

async function main() {
  loadDotenv();

  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL must be set');

  await mongoose.connect(url);
  console.log('Connected. Running bid-permissions backfill...');

  const Permission = mongoose.model('Permission', PermissionSchema);
  const Role = mongoose.model('Role', RoleSchema);
  const AiPlan = mongoose.model('AiPlan', AiPlanSchema);
  const AiFeature = mongoose.model('AiFeature', AiFeatureSchema);

  // 1. Upsert permission docs.
  let permissionsInserted = 0;
  for (const def of BID_PERMISSION_DEFS) {
    const result = await Permission.updateOne(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true },
    );
    if (result.upsertedCount > 0) permissionsInserted += 1;
  }
  console.log(
    `Permissions: ${permissionsInserted} new, ${BID_PERMISSION_DEFS.length - permissionsInserted} already present.`,
  );

  // 2. Push manage:bids into existing PM and PROCUREMENT role docs.
  const rolesResult = await Role.updateMany(
    { name: { $in: TARGET_ROLE_NAMES } },
    { $addToSet: { permissionKeys: 'manage:bids' } },
  );
  console.log(
    `Roles: matched ${rolesResult.matchedCount}, modified ${rolesResult.modifiedCount} (PM + PROCUREMENT across all orgs).`,
  );

  // 3. Upsert the AI feature doc (also auto-synced at startup; we run it here
  //    so the script can be used to provision a fresh DB end-to-end).
  const bidFeature = AI_FEATURES.AI_BID_ANALYSIS;
  const featureResult = await AiFeature.updateOne(
    { key: bidFeature.key },
    {
      $setOnInsert: {
        key: bidFeature.key,
        name: bidFeature.name,
        description: bidFeature.description,
        isActive: bidFeature.isActive ?? true,
      },
    },
    { upsert: true },
  );
  console.log(
    `AI feature "${bidFeature.key}": ${featureResult.upsertedCount > 0 ? 'inserted' : 'already present'}.`,
  );

  // 4. Attach the feature key to the chosen AI plan tiers.
  const targetTiers = parseTierArg();
  const planResult = await AiPlan.updateMany(
    { tier: { $in: targetTiers }, isActive: { $ne: false } },
    { $addToSet: { features: bidFeature.key } },
  );
  console.log(
    `AI plans: matched ${planResult.matchedCount} (tier in ${targetTiers.join(', ')}), modified ${planResult.modifiedCount}.`,
  );

  console.log('Backfill complete.');
  await mongoose.disconnect();
}

main()
  .catch(async (err) => {
    console.error('Backfill failed:', err);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
