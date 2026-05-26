// Surveyor (Quantity Surveyor) demo data seeder.
//
// The main `seed.ts` provisions auth/RBAC + projects, but no cost-domain rows —
// so a fresh SURVEYOR login lands on empty BOQ / variations / valuations /
// budget / purchase-order lists. This script populates realistic demo data on
// the Company-A projects the demo QS (qs@constructiq.com) already belongs to.
//
// What it seeds (every collection behind http://localhost:3000/surveyor/*):
//   • boq_items      → /surveyor/boq
//   • variations     → /surveyor/variations   (mix of PENDING/APPROVED/REJECTED)
//   • valuations     → /surveyor/valuations   (mix of DRAFT/SUBMITTED/CERTIFIED)
//   • budgets        → /surveyor/budget        (+ budget_lines + expenses)
//   • suppliers      → (referenced by POs)
//   • purchase_orders→ /surveyor/orders         (read-only for the QS)
// The /surveyor/dashboard page is a static placeholder (no API), so nothing to seed there.
//
// Idempotent: every row upserts on a natural/synthetic key, so re-running never
// duplicates. Depends on `npm run seed` having run first (it resolves org/users/
// projects by their natural keys), but imports nothing from it.
//
// Run:
//   TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}' npx ts-node scripts/seed-surveyor.ts
//   — or — npm run seed:surveyor

// Plugin registration (global cuid `_id`) MUST happen before any schema is constructed.
import '../src/database/mongoose/init';

import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';

import { OrganizationSchema } from '../src/modules/organizations/schemas/organization.schema';
import { UserSchema } from '../src/modules/users/schemas/user.schema';
import { ProjectSchema } from '../src/modules/projects/schemas/project.schema';
import { BoqItemSchema } from '../src/modules/surveyor/schemas/boq-item.schema';
import { VariationSchema, VariationStatus } from '../src/modules/surveyor/schemas/variation.schema';
import { ValuationSchema, ValuationStatus } from '../src/modules/surveyor/schemas/valuation.schema';
import { BudgetSchema } from '../src/modules/budget/schemas/budget.schema';
import { BudgetLineSchema } from '../src/modules/budget/schemas/budget-line.schema';
import { ExpenseSchema } from '../src/modules/budget/schemas/expense.schema';
import { SupplierSchema } from '../src/modules/procurement/schemas/supplier.schema';
import { PurchaseOrderSchema } from '../src/modules/procurement/schemas/purchase-order.schema';
import { PurchaseOrderStatus } from '../src/common/enums';

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

// ── Date helpers (anchored on "today", truncated to UTC midnight) ────────────
const DAY = 24 * 60 * 60 * 1000;
const midnightUtc = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const daysAgo = (n: number): Date => midnightUtc(new Date(Date.now() - n * DAY));
const daysFromNow = (n: number): Date => midnightUtc(new Date(Date.now() + n * DAY));

async function main() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL must be set');

  await mongoose.connect(url);
  console.log('Seeding Surveyor (QS) demo data...');

  const Organization = mongoose.model('Organization', OrganizationSchema);
  const User = mongoose.model('User', UserSchema);
  const Project = mongoose.model('Project', ProjectSchema);
  const BoqItem = mongoose.model('BoqItem', BoqItemSchema);
  const Variation = mongoose.model('Variation', VariationSchema);
  const Valuation = mongoose.model('Valuation', ValuationSchema);
  const Budget = mongoose.model('Budget', BudgetSchema);
  const BudgetLine = mongoose.model('BudgetLine', BudgetLineSchema);
  const Expense = mongoose.model('Expense', ExpenseSchema);
  const Supplier = mongoose.model('Supplier', SupplierSchema);
  const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
  void Organization;

  // ── Resolve references off the QS's OWN org + membership ───────────────────
  // Anchor everything on the demo QS's actual organizationId and the projects
  // they already belong to — exactly what the app surfaces them. The SURVEYOR
  // role holds `manage:budget`, so BOQ/variations/valuations are org-wide; POs
  // and budgets are member-scoped, but the QS is seeded as a member of every
  // Company-A project, so all five lists resolve.
  const qs = await User.findOne({ email: 'qs@constructiq.com' });
  if (!qs) {
    throw new Error('Missing demo QS (qs@constructiq.com). Run `npm run seed` first.');
  }
  const orgId = qs.organizationId?.toString();
  const qsId = qs._id.toString();
  if (!orgId) throw new Error('QS has no organizationId. Run `npm run seed` first.');

  // PM is the approver/certifier for variations, valuations, and POs.
  const pm = await User.findOne({ email: 'pm@constructiq.com', organizationId: orgId });
  const pmId = (pm?._id ?? qs._id).toString();

  // Resolve the org's projects by name, falling back positionally. Dev DBs vary
  // (some QS orgs carry only 2 projects), so each anchor is optional — def rows
  // for an unresolved project are skipped below rather than failing the run.
  const byName = async (name: string) =>
    Project.findOne({ organizationId: orgId, name, deletedAt: null });
  const ordered = await Project.find({ organizationId: orgId, deletedAt: null })
    .sort({ createdAt: 1 })
    .lean();
  if (ordered.length === 0) {
    throw new Error(`No projects in org ${orgId}. Run \`npm run seed\` first.`);
  }

  const tower = (await byName('Tower Heights')) ?? ordered[0];
  const green = (await byName('Green Valley Residences')) ?? ordered[1];
  const metro = (await byName('Metro Office Complex')) ?? ordered[2];

  // undefined when the org has fewer projects — def rows referencing it are dropped.
  const thId = tower?._id?.toString();
  const gvId = green?._id?.toString();
  const mocId = metro?._id?.toString();
  console.log(`  org=${orgId}`);
  console.log(
    `  TH=${tower?.name ?? '—'}(${thId ?? '—'})  GV=${green?.name ?? '—'}(${gvId ?? '—'})  MOC=${metro?.name ?? '—'}(${mocId ?? '—'})`,
  );

  // Drop def rows whose project didn't resolve in this org.
  const present = <T extends { projectId?: string }>(
    rows: T[],
  ): Array<T & { projectId: string }> =>
    rows.filter((r): r is T & { projectId: string } => !!r.projectId);

  const upsert = async (
    Model: mongoose.Model<any>,
    key: Record<string, unknown>,
    doc: Record<string, unknown>,
  ): Promise<void> => {
    await Model.findOneAndUpdate(key, { $setOnInsert: doc }, { upsert: true, new: true });
  };

  // ── BOQ items ──────────────────────────────────────────────────────────────
  // Unique on (projectId, code). totalAmount = quantity * unitRate (service enforces this).
  const boqDefs: Array<{
    projectId?: string;
    code: string;
    description: string;
    unit: string;
    quantity: number;
    unitRate: number;
    isLocked?: boolean;
  }> = [
    // Tower Heights — fuller priced bill
    { projectId: thId, code: 'A.01', description: 'Site clearance and topsoil strip', unit: 'm²', quantity: 4200, unitRate: 3.5 },
    { projectId: thId, code: 'A.02', description: 'Bulk excavation to reduced level', unit: 'm³', quantity: 6800, unitRate: 12 },
    { projectId: thId, code: 'B.01', description: 'Mass concrete to foundations (C30)', unit: 'm³', quantity: 950, unitRate: 165, isLocked: true },
    { projectId: thId, code: 'B.02', description: 'Reinforcement bar Y16 to foundations', unit: 't', quantity: 78, unitRate: 1150 },
    { projectId: thId, code: 'C.01', description: 'Reinforced concrete to suspended slabs (C40)', unit: 'm³', quantity: 1850, unitRate: 210 },
    { projectId: thId, code: 'C.02', description: 'Formwork to soffits of slabs', unit: 'm²', quantity: 9200, unitRate: 38 },
    { projectId: thId, code: 'D.01', description: 'Blockwork 200mm to internal walls', unit: 'm²', quantity: 5400, unitRate: 46 },
    { projectId: thId, code: 'E.01', description: 'Structural steelwork — fabricated and erected', unit: 't', quantity: 240, unitRate: 2650 },
    { projectId: thId, code: 'F.01', description: 'Bituminous waterproofing to basement walls', unit: 'm²', quantity: 1600, unitRate: 28 },
    { projectId: thId, code: 'M.01', description: 'MEP first-fix containment and conduit', unit: 'item', quantity: 1, unitRate: 412000 },
    // Green Valley — early-stage enabling works
    { projectId: gvId, code: 'A.01', description: 'Site establishment and hoarding', unit: 'item', quantity: 1, unitRate: 86000 },
    { projectId: gvId, code: 'A.02', description: 'Topsoil strip to block A footprint', unit: 'm²', quantity: 3100, unitRate: 3.2 },
    { projectId: gvId, code: 'A.03', description: 'Crushed-stone sub-base to access road', unit: 'm³', quantity: 480, unitRate: 28 },
    { projectId: gvId, code: 'B.01', description: 'Mass concrete to pad foundations (C30)', unit: 'm³', quantity: 320, unitRate: 168 },
    // Metro Office Complex — on hold, indicative bill
    { projectId: mocId, code: 'A.01', description: 'Demolition of existing structures', unit: 'item', quantity: 1, unitRate: 540000 },
    { projectId: mocId, code: 'B.01', description: 'Piling — CFA 600mm dia', unit: 'm', quantity: 4200, unitRate: 95 },
    { projectId: mocId, code: 'C.01', description: 'Reinforced concrete frame', unit: 'm³', quantity: 3400, unitRate: 215 },
  ];

  let boqCount = 0;
  for (const def of present(boqDefs)) {
    const { isLocked, quantity, unitRate, ...rest } = def;
    await upsert(
      BoqItem,
      { projectId: def.projectId, code: def.code },
      {
        organizationId: orgId,
        quantity,
        unitRate,
        totalAmount: quantity * unitRate,
        isLocked: isLocked ?? false,
        ...rest,
      },
    );
    boqCount++;
  }
  console.log(`  BOQ items: ${boqCount} upserted`);

  // ── Variations ───────────────────────────────────────────────────────────
  // Key = (projectId, title). APPROVED carries approver + timestamp.
  const variationDefs: Array<{
    projectId?: string;
    title: string;
    description: string;
    impactAmount: number;
    status: VariationStatus;
    approvedDaysAgo?: number;
  }> = [
    { projectId: thId, title: 'VO-01 Additional piling to grid line F', description: 'Ground conditions at grid F required four extra bored piles per the geotech addendum.', impactAmount: 86500, status: VariationStatus.APPROVED, approvedDaysAgo: 12 },
    { projectId: thId, title: 'VO-02 Upgrade lobby finishes to natural stone', description: 'Client-requested upgrade from porcelain tile to honed granite in the main lobby.', impactAmount: 42000, status: VariationStatus.APPROVED, approvedDaysAgo: 6 },
    { projectId: thId, title: 'VO-03 Omit basement car-stacker', description: 'Mechanical car-stacker deleted from basement scope; conventional bays substituted.', impactAmount: -58000, status: VariationStatus.APPROVED, approvedDaysAgo: 3 },
    { projectId: thId, title: 'VO-04 Revised MEP riser layout', description: 'Coordination clash forced a re-route of the level-5 risers; additional containment and labour.', impactAmount: 18750, status: VariationStatus.PENDING },
    { projectId: thId, title: 'VO-05 Acoustic upgrade to party walls', description: 'Upgrade party-wall construction to meet revised acoustic spec.', impactAmount: 24800, status: VariationStatus.PENDING },
    { projectId: thId, title: 'VO-06 Temporary works — extended crane hire', description: 'Two-week crane hire extension claimed by main contractor — under review.', impactAmount: 31000, status: VariationStatus.REJECTED },
    { projectId: gvId, title: 'VO-01 Relocate site office', description: 'Site office relocated to suit revised access; minor groundworks.', impactAmount: 9500, status: VariationStatus.PENDING },
    { projectId: gvId, title: 'VO-02 Additional utility trial pits', description: 'Three trial pits to confirm existing services before excavation.', impactAmount: 6200, status: VariationStatus.APPROVED, approvedDaysAgo: 2 },
    { projectId: mocId, title: 'VO-01 Asbestos removal — phase 1', description: 'Licensed asbestos removal identified in the demolition survey.', impactAmount: 112000, status: VariationStatus.PENDING },
  ];

  let variationCount = 0;
  for (const def of present(variationDefs)) {
    const { approvedDaysAgo, ...rest } = def;
    const approved = def.status === VariationStatus.APPROVED;
    await upsert(
      Variation,
      { organizationId: orgId, projectId: def.projectId, title: def.title },
      {
        organizationId: orgId,
        currency: 'USD',
        ...rest,
        ...(approved
          ? { approvedById: pmId, approvedAt: daysAgo(approvedDaysAgo ?? 1) }
          : {}),
      },
    );
    variationCount++;
  }
  console.log(`  Variations: ${variationCount} upserted`);

  // ── Valuations ───────────────────────────────────────────────────────────
  // Unique on (projectId, period). CERTIFIED carries certifier + timestamp.
  const valuationDefs: Array<{
    projectId?: string;
    period: string;
    amountUsd: number;
    retentionUsd: number;
    status: ValuationStatus;
    certifiedDaysAgo?: number;
  }> = [
    { projectId: thId, period: 'January 2026', amountUsd: 980000, retentionUsd: 49000, status: ValuationStatus.CERTIFIED, certifiedDaysAgo: 110 },
    { projectId: thId, period: 'February 2026', amountUsd: 1150000, retentionUsd: 57500, status: ValuationStatus.CERTIFIED, certifiedDaysAgo: 80 },
    { projectId: thId, period: 'March 2026', amountUsd: 1340000, retentionUsd: 67000, status: ValuationStatus.CERTIFIED, certifiedDaysAgo: 50 },
    { projectId: thId, period: 'April 2026', amountUsd: 1420000, retentionUsd: 71000, status: ValuationStatus.SUBMITTED },
    { projectId: thId, period: 'May 2026', amountUsd: 1180000, retentionUsd: 59000, status: ValuationStatus.DRAFT },
    { projectId: gvId, period: 'April 2026', amountUsd: 210000, retentionUsd: 10500, status: ValuationStatus.SUBMITTED },
    { projectId: gvId, period: 'May 2026', amountUsd: 165000, retentionUsd: 8250, status: ValuationStatus.DRAFT },
  ];

  let valuationCount = 0;
  for (const def of present(valuationDefs)) {
    const { certifiedDaysAgo, ...rest } = def;
    const certified = def.status === ValuationStatus.CERTIFIED;
    await upsert(
      Valuation,
      { projectId: def.projectId, period: def.period },
      {
        organizationId: orgId,
        ...rest,
        ...(certified
          ? { certifiedById: pmId, certifiedAt: daysAgo(certifiedDaysAgo ?? 1) }
          : {}),
      },
    );
    valuationCount++;
  }
  console.log(`  Valuations: ${valuationCount} upserted`);

  // ── Budgets (one per project, unique on projectId) + lines + expenses ──────
  const budgetDefs: Array<{
    projectId?: string;
    totalAmount: number;
    notes: string;
    lines: Array<{ category: string; description: string; plannedAmount: number }>;
  }> = [
    {
      projectId: thId,
      totalAmount: 15000000,
      notes: 'Cost plan aligned to the priced BOQ; carries 5% contingency.',
      lines: [
        { category: 'Substructure', description: 'Excavation, foundations, basement', plannedAmount: 2400000 },
        { category: 'Superstructure', description: 'Frame, slabs, upper floors', plannedAmount: 5600000 },
        { category: 'Envelope', description: 'Facade, roofing, waterproofing', plannedAmount: 2100000 },
        { category: 'MEP', description: 'Mechanical, electrical, plumbing', plannedAmount: 2900000 },
        { category: 'Finishes', description: 'Internal finishes and fit-out', plannedAmount: 1250000 },
        { category: 'Preliminaries & contingency', description: 'Site setup, management, 5% contingency', plannedAmount: 750000 },
      ],
    },
    {
      projectId: gvId,
      totalAmount: 8500000,
      notes: 'Indicative budget; project in planning/enabling-works stage.',
      lines: [
        { category: 'Enabling works', description: 'Site establishment, clearance, access', plannedAmount: 650000 },
        { category: 'Substructure', description: 'Foundations and ground floor', plannedAmount: 1900000 },
        { category: 'Superstructure', description: 'Frame and upper floors', plannedAmount: 3200000 },
        { category: 'Finishes & MEP', description: 'Services and fit-out', plannedAmount: 2100000 },
        { category: 'Preliminaries', description: 'Management and overheads', plannedAmount: 650000 },
      ],
    },
    {
      projectId: mocId,
      totalAmount: 22000000,
      notes: 'On-hold scheme; budget retained for reactivation.',
      lines: [
        { category: 'Demolition & enabling', description: 'Demolition, asbestos, site prep', plannedAmount: 1800000 },
        { category: 'Substructure', description: 'Piling and foundations', plannedAmount: 3600000 },
        { category: 'Superstructure', description: 'Concrete frame', plannedAmount: 8200000 },
        { category: 'MEP & finishes', description: 'Services and Cat-A fit-out', plannedAmount: 6400000 },
        { category: 'Preliminaries & contingency', description: 'Management and contingency', plannedAmount: 2000000 },
      ],
    },
  ];

  // Expenses (committed/actual cost) — only meaningful on the active Tower Heights job.
  // Keyed by reference so re-runs are stable; linked to a budget line by category.
  const expenseDefs: Array<{
    projectId?: string;
    lineCategory: string;
    reference: string;
    description: string;
    amount: number;
    daysAgo: number;
  }> = [
    { projectId: thId, lineCategory: 'Substructure', reference: 'INV-TH-1001', description: 'Bulk excavation — interim payment 1', amount: 184000, daysAgo: 95 },
    { projectId: thId, lineCategory: 'Substructure', reference: 'INV-TH-1002', description: 'Foundation concrete and rebar', amount: 312000, daysAgo: 70 },
    { projectId: thId, lineCategory: 'Superstructure', reference: 'INV-TH-1003', description: 'Slab pours levels 1–4', amount: 540000, daysAgo: 40 },
    { projectId: thId, lineCategory: 'MEP', reference: 'INV-TH-1004', description: 'MEP first-fix materials', amount: 96000, daysAgo: 15 },
    { projectId: gvId, lineCategory: 'Enabling works', reference: 'INV-GV-2001', description: 'Site establishment and hoarding', amount: 78000, daysAgo: 10 },
  ];

  let budgetCount = 0;
  let lineCount = 0;
  const lineIdByKey: Record<string, string> = {}; // `${projectId}|${category}` → budgetLineId
  for (const def of present(budgetDefs)) {
    const budget = await Budget.findOneAndUpdate(
      { projectId: def.projectId },
      {
        $setOnInsert: {
          organizationId: orgId,
          totalAmount: def.totalAmount,
          currency: 'USD',
          notes: def.notes,
        },
      },
      { upsert: true, new: true },
    );
    budgetCount++;
    const budgetId = budget!._id.toString();

    for (const line of def.lines) {
      const doc = await BudgetLine.findOneAndUpdate(
        { budgetId, category: line.category },
        { $setOnInsert: { budgetId, ...line } },
        { upsert: true, new: true },
      );
      lineIdByKey[`${def.projectId}|${line.category}`] = doc!._id.toString();
      lineCount++;
    }
  }
  console.log(`  Budgets: ${budgetCount} upserted (${lineCount} budget lines)`);

  // Resolve budgetId per project for expenses.
  const budgetIdByProject: Record<string, string> = {};
  for (const def of present(budgetDefs)) {
    const b = await Budget.findOne({ projectId: def.projectId }).lean();
    if (b) budgetIdByProject[def.projectId] = String((b as any)._id);
  }

  let expenseCount = 0;
  for (const def of present(expenseDefs)) {
    const budgetId = budgetIdByProject[def.projectId] ?? null;
    const budgetLineId = lineIdByKey[`${def.projectId}|${def.lineCategory}`] ?? null;
    await upsert(
      Expense,
      { organizationId: orgId, reference: def.reference },
      {
        organizationId: orgId,
        budgetId,
        budgetLineId,
        description: def.description,
        amount: def.amount,
        currency: 'USD',
        date: daysAgo(def.daysAgo),
      },
    );
    expenseCount++;
  }
  console.log(`  Expenses: ${expenseCount} upserted`);

  // ── Suppliers + Purchase Orders (read-only on /surveyor/orders) ────────────
  // Suppliers upsert by name, so they're shared with any procurement/site-eng seed.
  const supplierDefs = [
    { name: 'Apex Building Supplies', contactName: 'Maria Gomez', email: 'orders@apexbuilding.test', phone: '+1-555-0142', address: '14 Quarry Road, Industrial Estate' },
    { name: 'Volt MEP Distributors', contactName: 'Derek Ahn', email: 'sales@voltmep.test', phone: '+1-555-0177', address: 'Unit 7, Riverside Trade Park' },
    { name: 'SteelLine Fabricators', contactName: 'Nadia Rossi', email: 'estimating@steelline.test', phone: '+1-555-0188', address: '32 Foundry Lane' },
  ];
  const supplierIds: Record<string, string> = {};
  for (const def of supplierDefs) {
    const doc = await Supplier.findOneAndUpdate(
      { organizationId: orgId, name: def.name },
      { $setOnInsert: { organizationId: orgId, isActive: true, ...def } },
      { upsert: true, new: true },
    );
    supplierIds[def.name] = doc!._id.toString();
  }
  console.log(`  Suppliers: ${supplierDefs.length} upserted`);

  const poDefs: Array<{
    poNumber: string;
    projectId?: string;
    supplier: string;
    status: PurchaseOrderStatus;
    orderDaysAgo: number;
    expectedDaysFromNow: number;
    approvedDaysAgo?: number;
    notes: string;
    items: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>;
  }> = [
    {
      poNumber: 'PO-SUR-TH-301', projectId: thId, supplier: 'SteelLine Fabricators',
      status: PurchaseOrderStatus.APPROVED, orderDaysAgo: 30, expectedDaysFromNow: 10, approvedDaysAgo: 28,
      notes: 'Structural steel package — phase 1 erection.',
      items: [
        { description: 'Fabricated steel beams (UB)', quantity: 80, unit: 't', unitPrice: 2650 },
        { description: 'Fabricated steel columns (UC)', quantity: 60, unit: 't', unitPrice: 2700 },
      ],
    },
    {
      poNumber: 'PO-SUR-TH-302', projectId: thId, supplier: 'Apex Building Supplies',
      status: PurchaseOrderStatus.APPROVED, orderDaysAgo: 18, expectedDaysFromNow: 4, approvedDaysAgo: 16,
      notes: 'Concrete and rebar for level 5–6 cycle.',
      items: [
        { description: 'Ready-mix concrete C40', quantity: 220, unit: 'm³', unitPrice: 110 },
        { description: 'Rebar Y16', quantity: 14, unit: 't', unitPrice: 1150 },
      ],
    },
    {
      poNumber: 'PO-SUR-TH-303', projectId: thId, supplier: 'Volt MEP Distributors',
      status: PurchaseOrderStatus.SUBMITTED, orderDaysAgo: 5, expectedDaysFromNow: 14,
      notes: 'MEP second-fix containment — awaiting PM approval.',
      items: [
        { description: 'Galvanised cable tray 300mm', quantity: 400, unit: 'm', unitPrice: 14 },
        { description: 'Distribution boards', quantity: 12, unit: 'each', unitPrice: 850 },
      ],
    },
    {
      poNumber: 'PO-SUR-GV-310', projectId: gvId, supplier: 'Apex Building Supplies',
      status: PurchaseOrderStatus.DRAFT, orderDaysAgo: 2, expectedDaysFromNow: 21,
      notes: 'Sub-base aggregate for access road — draft for review.',
      items: [
        { description: 'Crushed stone (sub-base)', quantity: 480, unit: 'm³', unitPrice: 28 },
      ],
    },
  ];

  let poCount = 0;
  for (const def of present(poDefs)) {
    const { supplier, items, orderDaysAgo, expectedDaysFromNow, approvedDaysAgo, status, ...rest } = def;
    const pricedItems = items.map((it) => ({ ...it, totalPrice: it.quantity * it.unitPrice, notes: null }));
    const totalAmount = pricedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const approved = status === PurchaseOrderStatus.APPROVED;
    await upsert(
      PurchaseOrder,
      { organizationId: orgId, poNumber: def.poNumber },
      {
        organizationId: orgId,
        supplierId: supplierIds[supplier],
        status,
        currency: 'USD',
        totalAmount,
        items: pricedItems,
        orderDate: daysAgo(orderDaysAgo),
        expectedDeliveryDate: daysFromNow(expectedDaysFromNow),
        ...(approved ? { approvedById: pmId, approvedAt: daysAgo(approvedDaysAgo ?? 1) } : {}),
        ...rest,
      },
    );
    poCount++;
  }
  console.log(`  Purchase orders: ${poCount} upserted`);

  console.log('\nSurveyor demo data seed complete.');
  console.log('  Log in as qs@constructiq.com / Demo@1234 and open /surveyor/*');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
