// Site Engineer demo data seeder.
//
// The main `seed.ts` provisions auth/RBAC + projects + org-settings + billing,
// but no field-work domain rows — so a fresh SITE_ENG login lands on empty
// dashboards/lists. This script populates realistic demo data (daily reports,
// tasks, issues, inspections, RFIs, documents) on the Company-A projects the
// demo engineer (engineer@constructiq.com) already belongs to.
//
// Idempotent: every row upserts on a natural/synthetic key, so re-running never
// duplicates. Depends on `npm run seed` having run first (it resolves org/users/
// projects by their natural keys), but imports nothing from it.
//
// Run (the npm form's inline-JSON arg gets shell-mangled in some shells):
//   TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}' npx ts-node scripts/seed-site-eng.ts
//   — or — npm run seed:site-eng

// Plugin registration (global cuid `_id`) MUST happen before any schema is constructed.
import '../src/database/mongoose/init';

import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';

import { OrganizationSchema } from '../src/modules/organizations/schemas/organization.schema';
import { UserSchema } from '../src/modules/users/schemas/user.schema';
import { ProjectSchema } from '../src/modules/projects/schemas/project.schema';
import { DailyReportSchema } from '../src/modules/reports/schemas/daily-report.schema';
import { IssueSchema } from '../src/modules/issues/schemas/issue.schema';
import { TaskSchema } from '../src/modules/projects/schemas/task.schema';
import { InspectionSchema } from '../src/modules/inspections/schemas/inspection.schema';
import { RfiSchema } from '../src/modules/rfis/schemas/rfi.schema';
import { DocumentEntitySchema } from '../src/modules/documents/schemas/document.schema';
import { SupplierSchema } from '../src/modules/procurement/schemas/supplier.schema';
import { PurchaseOrderSchema } from '../src/modules/procurement/schemas/purchase-order.schema';
import { DeliverySchema } from '../src/modules/procurement/schemas/delivery.schema';
import {
  IssueType,
  IssueSeverity,
  IssueStatus,
  TaskStatus,
  TaskPriority,
  InspectionType,
  InspectionStatus,
  RfiDiscipline,
  RfiStatus,
  DocumentType,
  PurchaseOrderStatus,
  DeliveryStatus,
} from '../src/common/enums';

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
// Truncating to midnight is what makes the seed idempotent: `reportDate` is part
// of the daily-report upsert key, so a raw Date.now() (ms-precision) would mint a
// fresh key — and a duplicate row — on every run. Day-granularity keeps same-day
// reruns stable while preserving the "recent" semantics the dashboard needs.
const DAY = 24 * 60 * 60 * 1000;
const midnightUtc = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const daysAgo = (n: number): Date => midnightUtc(new Date(Date.now() - n * DAY));
const daysFromNow = (n: number): Date => midnightUtc(new Date(Date.now() + n * DAY));

async function main() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL must be set');

  await mongoose.connect(url);
  console.log('Seeding Site Engineer demo data...');

  const Organization = mongoose.model('Organization', OrganizationSchema);
  const User = mongoose.model('User', UserSchema);
  const Project = mongoose.model('Project', ProjectSchema);
  const DailyReport = mongoose.model('DailyReport', DailyReportSchema);
  const Issue = mongoose.model('Issue', IssueSchema);
  const Task = mongoose.model('Task', TaskSchema);
  const Inspection = mongoose.model('Inspection', InspectionSchema);
  const Rfi = mongoose.model('Rfi', RfiSchema);
  const DocumentEntity = mongoose.model('Document', DocumentEntitySchema);
  const Supplier = mongoose.model('Supplier', SupplierSchema);
  const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
  const Delivery = mongoose.model('Delivery', DeliverySchema);

  // ── Resolve references off the engineer's OWN org + membership ─────────────
  // Resolving by org slug / project name is fragile: dev DBs accumulate
  // duplicate "Company A" orgs and projects, and the demo engineer's real org
  // may not carry the `company-a` slug. Anchor everything on the engineer's
  // actual organizationId and the projects they already belong to — that is
  // exactly what the member-scoped app shows them.
  const engineer = await User.findOne({ email: 'engineer@constructiq.com' });
  if (!engineer) {
    throw new Error('Missing demo engineer (engineer@constructiq.com). Run `npm run seed` first.');
  }
  const orgId = engineer.organizationId?.toString();
  const engId = engineer._id.toString();
  if (!orgId) throw new Error('Engineer has no organizationId. Run `npm run seed` first.');

  const pm = await User.findOne({ email: 'pm@constructiq.com', organizationId: orgId });
  // Fall back to any PM-less reference = the engineer (so refs stay valid even
  // if the demo PM lives elsewhere); but normally pm is in the same org.
  const pmId = (pm?._id ?? engineer._id).toString();

  const memberClause = { organizationId: orgId, 'members.userId': engId, deletedAt: null };
  const towerHeights =
    (await Project.findOne({ ...memberClause, name: 'Tower Heights' })) ??
    (await Project.findOne({ ...memberClause, status: 'ACTIVE' }));
  const greenValley =
    (await Project.findOne({ ...memberClause, name: 'Green Valley Residences' })) ??
    (await Project.findOne({ ...memberClause, _id: { $ne: towerHeights?._id } }));

  if (!towerHeights || !greenValley) {
    throw new Error(
      `Engineer is not a member of two resolvable projects in org ${orgId}. Run \`npm run seed\` first.`,
    );
  }

  const thId = towerHeights._id.toString();
  const gvId = greenValley._id.toString();
  console.log(`  org=${orgId}  TH=${towerHeights.name}(${thId})  GV=${greenValley.name}(${gvId})`);

  // ── Idempotent upsert helper ───────────────────────────────────────────────
  const upsert = async (
    Model: mongoose.Model<any>,
    key: Record<string, unknown>,
    doc: Record<string, unknown>,
  ): Promise<void> => {
    await Model.findOneAndUpdate(key, { $setOnInsert: doc }, { upsert: true, new: true });
  };

  // ── Daily reports (createdById = engineer) ─────────────────────────────────
  const reportDefs = [
    {
      projectId: thId,
      reportDate: daysAgo(1),
      weather: 'Sunny',
      highTempC: 28,
      lowTempC: 17,
      workCompleted:
        'Completed concrete pour for the level-7 slab (east bay). Cured overnight, formwork stripping scheduled for tomorrow.\n\nReinforcement fixing continued on the level-8 columns.',
      blockers: null,
      notes: 'Pump truck arrived on time; pour finished ahead of schedule.',
      manpowerEntries: [
        { trade: 'Concreting', count: 8, contractor: 'Apex Concrete', notes: null },
        { trade: 'Steel fixing', count: 6, contractor: 'Rebar Co', notes: null },
        { trade: 'General labour', count: 4, contractor: null, notes: null },
      ],
      materialEntries: [
        { material: 'Ready-mix concrete C40', quantity: 120, unit: 'm³', notes: 'East bay slab' },
        { material: 'Rebar Y16', quantity: 3.5, unit: 't', notes: null },
      ],
      equipmentEntries: [
        { name: 'Concrete pump (38m boom)', hours: 6, notes: null },
        { name: 'Tower crane TC-1', hours: 9, notes: null },
      ],
    },
    {
      projectId: thId,
      reportDate: daysAgo(2),
      weather: 'Cloudy',
      highTempC: 24,
      lowTempC: 15,
      workCompleted:
        'Formwork erection for the level-7 slab. MEP first-fix conduit runs on level-5.',
      blockers: 'Awaiting delivery of additional formwork panels — short by ~40 m².',
      notes: null,
      manpowerEntries: [
        { trade: 'Carpentry', count: 7, contractor: 'FormWorks Ltd', notes: null },
        { trade: 'Electrical', count: 3, contractor: 'Volt MEP', notes: 'First fix' },
      ],
      materialEntries: [
        { material: 'Plywood formwork 18mm', quantity: 60, unit: 'sheets', notes: null },
        { material: 'PVC conduit 25mm', quantity: 300, unit: 'm', notes: null },
      ],
      equipmentEntries: [{ name: 'Tower crane TC-1', hours: 8, notes: null }],
    },
    {
      projectId: thId,
      reportDate: daysAgo(4),
      weather: 'Rain',
      highTempC: 19,
      lowTempC: 13,
      workCompleted:
        'Wet weather — external works paused. Internal blockwork on level-3 continued. Site drainage cleared.',
      blockers: 'Heavy rain halted crane lifts for the afternoon.',
      notes: 'Toolbox talk held on slip/trip hazards in wet conditions.',
      manpowerEntries: [
        { trade: 'Blockwork', count: 5, contractor: 'BuildRight', notes: null },
        { trade: 'General labour', count: 3, contractor: null, notes: null },
      ],
      materialEntries: [
        { material: 'Concrete blocks 200mm', quantity: 850, unit: 'pcs', notes: null },
        { material: 'Mortar', quantity: 2.5, unit: 'm³', notes: null },
      ],
      equipmentEntries: [{ name: 'Telehandler', hours: 4, notes: 'Reduced use — rain' }],
    },
    {
      projectId: thId,
      reportDate: daysAgo(6),
      weather: 'Sunny',
      highTempC: 27,
      lowTempC: 16,
      workCompleted:
        'Waterproofing membrane applied to the basement retaining wall (north face). Backfill commenced.',
      blockers: null,
      notes: null,
      manpowerEntries: [
        { trade: 'Waterproofing', count: 4, contractor: 'SealTech', notes: null },
        { trade: 'Earthworks', count: 3, contractor: 'DigPro', notes: null },
      ],
      materialEntries: [
        { material: 'Bituminous membrane', quantity: 220, unit: 'm²', notes: null },
        { material: 'Granular backfill', quantity: 45, unit: 'm³', notes: null },
      ],
      equipmentEntries: [
        { name: 'Excavator 20t', hours: 7, notes: null },
        { name: 'Plate compactor', hours: 5, notes: null },
      ],
    },
    {
      projectId: thId,
      reportDate: daysAgo(9),
      weather: 'Partly cloudy',
      highTempC: 25,
      lowTempC: 14,
      workCompleted:
        'Setting out for level-7 columns verified by survey. Procurement of MEP risers progressing.',
      blockers: null,
      notes: 'Survey check passed — within tolerance.',
      manpowerEntries: [
        { trade: 'Surveying', count: 2, contractor: null, notes: null },
        { trade: 'Steel fixing', count: 5, contractor: 'Rebar Co', notes: null },
      ],
      materialEntries: [{ material: 'Rebar Y20', quantity: 2.1, unit: 't', notes: null }],
      equipmentEntries: [{ name: 'Total station', hours: 3, notes: null }],
    },
    // Green Valley (lighter set)
    {
      projectId: gvId,
      reportDate: daysAgo(2),
      weather: 'Sunny',
      highTempC: 26,
      lowTempC: 15,
      workCompleted:
        'Site establishment ongoing — hoarding completed, site office set up. Topsoil strip for block A footprint.',
      blockers: null,
      notes: 'Project in early enabling-works stage.',
      manpowerEntries: [{ trade: 'Earthworks', count: 4, contractor: 'DigPro', notes: null }],
      materialEntries: [],
      equipmentEntries: [
        { name: 'Excavator 20t', hours: 8, notes: null },
        { name: 'Dump truck', hours: 6, notes: null },
      ],
    },
    {
      projectId: gvId,
      reportDate: daysAgo(5),
      weather: 'Cloudy',
      highTempC: 22,
      lowTempC: 13,
      workCompleted: 'Temporary site fencing and access road formation. Utilities survey conducted.',
      blockers: 'Awaiting confirmation of existing utility positions before excavation.',
      notes: null,
      manpowerEntries: [{ trade: 'General labour', count: 5, contractor: null, notes: null }],
      materialEntries: [{ material: 'Crushed stone (sub-base)', quantity: 80, unit: 'm³', notes: null }],
      equipmentEntries: [{ name: 'Roller', hours: 5, notes: null }],
    },
  ];

  let reportCount = 0;
  for (const def of reportDefs) {
    await upsert(
      DailyReport,
      { projectId: def.projectId, reportDate: def.reportDate },
      { organizationId: orgId, createdById: engId, ...def },
    );
    reportCount++;
  }
  console.log(`  Daily reports: ${reportCount} upserted`);

  // ── Tasks (mostly assigned to the engineer) ────────────────────────────────
  const taskDefs = [
    {
      projectId: thId,
      title: 'Inspect level-7 slab formwork before pour',
      description: 'Verify props, falsework, and edge protection ahead of the scheduled pour.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assignedToId: engId,
      completedAt: daysAgo(2),
      progress: 100,
      dueDate: daysAgo(2),
    },
    {
      projectId: thId,
      title: 'Record level-5 MEP first-fix progress',
      description: 'Photograph and log conduit runs against the coordinated services drawing.',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      assignedToId: engId,
      completedAt: daysAgo(3),
      progress: 100,
      dueDate: daysAgo(3),
    },
    {
      projectId: thId,
      title: 'Close out basement waterproofing snags',
      description: 'Follow up with SealTech on the two membrane lap defects flagged last week.',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      assignedToId: engId,
      completedAt: daysAgo(5),
      progress: 100,
      dueDate: daysAgo(5),
    },
    {
      projectId: thId,
      title: 'Coordinate level-8 column steel inspection',
      description: 'Arrange consultant inspection of rebar fixing before formwork close-up.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assignedToId: engId,
      dueDate: daysFromNow(2),
      progress: 40,
    },
    {
      projectId: thId,
      title: 'Update as-built marks for level-3 blockwork',
      description: 'Transfer site measurements onto the as-built set.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      assignedToId: engId,
      dueDate: daysFromNow(5),
      progress: 20,
    },
    {
      projectId: thId,
      title: 'Chase formwork panel delivery',
      description: 'Follow up with FormWorks Ltd on the outstanding ~40 m² of panels.',
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.HIGH,
      assignedToId: engId,
      dueDate: daysFromNow(1),
      progress: 0,
    },
    {
      projectId: thId,
      title: 'Prepare weekly progress photos pack',
      description: 'Compile level-by-level progress photos for the PM weekly report.',
      status: TaskStatus.REVIEW,
      priority: TaskPriority.MEDIUM,
      assignedToId: engId,
      dueDate: daysFromNow(3),
      progress: 80,
    },
    {
      projectId: thId,
      title: 'Set out level-8 column starter bars',
      description: 'Mark out starter positions per the setting-out drawing.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assignedToId: engId,
      dueDate: daysFromNow(6),
      progress: 0,
    },
    {
      projectId: thId,
      title: 'Review revised MEP riser shop drawings',
      description: 'Check the updated riser layout against structural openings.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assignedToId: engId,
      dueDate: daysFromNow(8),
      progress: 0,
    },
    // A couple assigned to the PM for realism (won't show on the engineer's My Tasks board).
    {
      projectId: thId,
      title: 'Approve level-7 pour method statement',
      description: 'PM sign-off on the concreting method statement.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assignedToId: pmId,
      completedAt: daysAgo(3),
      progress: 100,
      dueDate: daysAgo(3),
    },
    // Green Valley
    {
      projectId: gvId,
      title: 'Confirm existing utilities before excavation',
      description: 'Verify utility positions with the survey before any digging on block A.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      assignedToId: engId,
      dueDate: daysFromNow(2),
      progress: 30,
    },
    {
      projectId: gvId,
      title: 'Site establishment checklist',
      description: 'Complete the enabling-works establishment checklist.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assignedToId: engId,
      dueDate: daysFromNow(7),
      progress: 0,
    },
  ];

  let taskCount = 0;
  for (const def of taskDefs) {
    await upsert(
      Task,
      { organizationId: orgId, projectId: def.projectId, title: def.title },
      { organizationId: orgId, createdById: pmId, ...def },
    );
    taskCount++;
  }
  console.log(`  Tasks: ${taskCount} upserted`);

  // ── Inspections (inspectorId = engineer) ───────────────────────────────────
  // The FAILED one is referenced below by a linked issue (SE-3), so give it a
  // deterministic _id we can reuse across re-runs.
  const failedInspId = 'seed-insp-th-failed-membrane';

  const inspectionDefs = [
    {
      _id: failedInspId,
      projectId: thId,
      title: 'Basement waterproofing membrane inspection',
      description: 'Visual inspection of the north-face retaining wall membrane laps.',
      type: InspectionType.QUALITY,
      status: InspectionStatus.FAILED,
      scheduledFor: daysAgo(6),
      location: 'Basement — north retaining wall',
      notes: 'Two lap joints below spec; membrane re-work required before backfill sign-off.',
    },
    {
      projectId: thId,
      title: 'Level-8 column rebar inspection',
      description: 'Check bar size, spacing, cover, and laps prior to formwork close-up.',
      type: InspectionType.STRUCTURAL,
      status: InspectionStatus.SCHEDULED,
      scheduledFor: daysFromNow(2),
      location: 'Level 8 — columns C1–C6',
      notes: null,
    },
    {
      projectId: thId,
      title: 'Level-7 slab pre-pour inspection',
      description: 'Formwork, reinforcement, and embedment check before the level-7 pour.',
      type: InspectionType.STRUCTURAL,
      status: InspectionStatus.PASSED,
      scheduledFor: daysAgo(2),
      location: 'Level 7 — east bay',
      notes: 'All items satisfactory; cleared for pour.',
    },
    {
      projectId: thId,
      title: 'Site safety walkdown — scaffolding',
      description: 'Weekly scaffold tag and edge-protection check.',
      type: InspectionType.SAFETY,
      status: InspectionStatus.SCHEDULED,
      scheduledFor: daysFromNow(1),
      location: 'Whole site',
      notes: null,
    },
  ];

  let inspectionCount = 0;
  for (const def of inspectionDefs) {
    const { _id, ...rest } = def as { _id?: string } & Record<string, unknown>;
    const key = _id
      ? { _id }
      : { organizationId: orgId, projectId: def.projectId, title: def.title };
    await upsert(Inspection, key, {
      ...(_id ? { _id } : {}),
      organizationId: orgId,
      inspectorId: engId,
      createdById: engId,
      ...rest,
    });
    inspectionCount++;
  }
  console.log(`  Inspections: ${inspectionCount} upserted`);

  // ── Issues (one linked to the FAILED inspection) ───────────────────────────
  const issueDefs = [
    {
      projectId: thId,
      title: 'Deficiency: Basement waterproofing membrane inspection',
      description:
        'Two membrane lap joints on the north retaining wall are below spec. Raised from the failed waterproofing inspection. Re-work required before backfill sign-off.',
      type: IssueType.QUALITY,
      severity: IssueSeverity.HIGH,
      status: IssueStatus.OPEN,
      location: 'Basement — north retaining wall',
      trade: 'Waterproofing',
      assignedToId: engId,
      inspectionId: failedInspId,
    },
    {
      projectId: thId,
      title: 'Exposed rebar at level-5 slab edge',
      description: 'Starter bars protruding without caps near the south stair core — trip/impalement risk.',
      type: IssueType.SAFETY,
      severity: IssueSeverity.CRITICAL,
      status: IssueStatus.OPEN,
      location: 'Level 5 — south stair core',
      trade: 'Steel fixing',
      assignedToId: engId,
      inspectionId: null,
    },
    {
      projectId: thId,
      title: 'Honeycombing on level-4 column C3',
      description: 'Surface honeycombing observed after strike. Needs assessment and remedial grout.',
      type: IssueType.QUALITY,
      severity: IssueSeverity.MEDIUM,
      status: IssueStatus.IN_PROGRESS,
      location: 'Level 4 — column C3',
      trade: 'Concreting',
      assignedToId: engId,
      inspectionId: null,
    },
    {
      projectId: thId,
      title: 'MEP conduit clashes with structural downstand',
      description: 'Coordination clash between the level-5 conduit run and a beam downstand.',
      type: IssueType.TECHNICAL,
      severity: IssueSeverity.MEDIUM,
      status: IssueStatus.OPEN,
      location: 'Level 5 — grid C3',
      trade: 'Electrical',
      assignedToId: null,
      inspectionId: null,
    },
    {
      projectId: thId,
      title: 'Formwork panel shortage delaying level-7',
      description: 'Approx 40 m² of formwork panels outstanding, holding up the level-7 cycle.',
      type: IssueType.GENERAL,
      severity: IssueSeverity.HIGH,
      status: IssueStatus.RESOLVED,
      location: 'Level 7',
      trade: 'Formwork',
      assignedToId: engId,
      inspectionId: null,
      resolvedAt: daysAgo(1),
    },
    // Green Valley
    {
      projectId: gvId,
      title: 'Unmarked utility line near block A excavation',
      description: 'Possible buried service not shown on the utility survey — confirm before digging.',
      type: IssueType.SAFETY,
      severity: IssueSeverity.HIGH,
      status: IssueStatus.OPEN,
      location: 'Block A footprint',
      trade: 'Earthworks',
      assignedToId: engId,
      inspectionId: null,
    },
  ];

  let issueCount = 0;
  for (const def of issueDefs) {
    await upsert(
      Issue,
      { organizationId: orgId, projectId: def.projectId, title: def.title },
      { organizationId: orgId, createdById: engId, ...def },
    );
    issueCount++;
  }
  console.log(`  Issues: ${issueCount} upserted`);

  // ── RFIs (raised by engineer, respondent = PM) ─────────────────────────────
  const rfiDefs = [
    {
      // High number range so seed RFIs never collide with the service's
      // count-based RFI-000x in the same org.
      number: 'RFI-9001',
      projectId: thId,
      subject: 'Level-8 column rebar lap length',
      question:
        'The structural drawing S-208 and the bar bending schedule show different lap lengths for the Y20 column bars (45d vs 50d). Please confirm which governs.',
      discipline: RfiDiscipline.STRUCTURAL,
      status: RfiStatus.ANSWERED,
      answer: 'Use 50d laps for all Y20 column bars. The bending schedule governs; drawing S-208 to be revised.',
      dueBy: daysAgo(1),
      answeredAt: daysAgo(1),
    },
    {
      number: 'RFI-9002',
      projectId: thId,
      subject: 'MEP conduit routing around level-5 downstand',
      question:
        'The coordinated conduit run on level 5 clashes with a beam downstand at grid C3. Please advise on an acceptable re-route or whether a sleeve through the beam is permitted.',
      discipline: RfiDiscipline.ELECTRICAL,
      status: RfiStatus.OPEN,
      dueBy: daysFromNow(4),
    },
    {
      number: 'RFI-9003',
      projectId: gvId,
      subject: 'Existing utility positions at block A',
      question:
        'The utility survey is inconclusive about a possible service crossing the block-A footprint. Please confirm positions or authorise a trial pit before excavation.',
      discipline: RfiDiscipline.CIVIL,
      status: RfiStatus.OPEN,
      dueBy: daysFromNow(3),
    },
  ];

  let rfiCount = 0;
  for (const def of rfiDefs) {
    const answered = def.status === RfiStatus.ANSWERED;
    await upsert(
      Rfi,
      { organizationId: orgId, number: def.number },
      {
        organizationId: orgId,
        createdById: engId,
        respondentId: pmId,
        ...def,
        ...(answered ? { answeredById: pmId } : {}),
      },
    );
    rfiCount++;
  }
  console.log(`  RFIs: ${rfiCount} upserted`);

  // ── Documents (project-level; dailyReportId null so they show on the docs page) ─
  const docDefs = [
    {
      projectId: thId,
      type: DocumentType.DRAWING,
      name: 'S-208 Level-8 Columns (Rev C).pdf',
      description: 'Structural column layout and rebar details, level 8.',
      fileKey: 'seed/TH-001/s-208-level8-columns-revC.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1_840_000,
    },
    {
      projectId: thId,
      type: DocumentType.TECHNICAL_FILE,
      name: 'Concreting Method Statement (Level 7).pdf',
      description: 'Approved method statement for the level-7 slab pour.',
      fileKey: 'seed/TH-001/ms-level7-pour.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 620_000,
    },
    {
      projectId: thId,
      type: DocumentType.REPORT,
      name: 'Weekly Progress Report (Week 21).pdf',
      description: 'Weekly progress summary for the PM.',
      fileKey: 'seed/TH-001/weekly-progress-w21.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 410_000,
    },
    {
      projectId: gvId,
      type: DocumentType.DRAWING,
      name: 'Site Establishment Layout.pdf',
      description: 'Enabling-works site layout for Green Valley.',
      fileKey: 'seed/GVR-002/site-establishment-layout.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 980_000,
    },
  ];

  let docCount = 0;
  for (const def of docDefs) {
    await upsert(
      DocumentEntity,
      { organizationId: orgId, fileKey: def.fileKey },
      {
        organizationId: orgId,
        dailyReportId: null,
        issueId: null,
        uploadedById: engId,
        fileUrl: `https://demo.constructiq.test/${def.fileKey}`,
        ...def,
      },
    );
    docCount++;
  }
  console.log(`  Documents: ${docCount} upserted`);

  // ── Deliveries (Suppliers → Purchase Orders → Deliveries) ──────────────────
  // The /site-eng/deliveries page is member-scoped via PO→project: the engineer
  // sees deliveries whose PO sits on one of their member projects. So we seed
  // suppliers + approved POs on TH/GV, then deliveries against those POs with a
  // spread of statuses — some still PENDING/IN_TRANSIT/DELAYED (confirmable via
  // the "Confirm receipt" action) and some already DELIVERED (received by the
  // engineer) so the receipt history isn't empty.
  const supplierDefs = [
    {
      name: 'Apex Building Supplies',
      contactName: 'Maria Gomez',
      email: 'orders@apexbuilding.test',
      phone: '+1-555-0142',
      address: '14 Quarry Road, Industrial Estate',
    },
    {
      name: 'Volt MEP Distributors',
      contactName: 'Derek Ahn',
      email: 'sales@voltmep.test',
      phone: '+1-555-0177',
      address: 'Unit 7, Riverside Trade Park',
    },
  ];

  // Resolve supplier ids after upsert (findOneAndUpdate with new:true returns the doc).
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

  const poDefs = [
    {
      poNumber: 'PO-TH-101',
      projectId: thId,
      supplier: 'Apex Building Supplies',
      orderDate: daysAgo(8),
      expectedDeliveryDate: daysAgo(1),
      notes: 'Rebar + ready-mix for level-7/8 cycle.',
      items: [
        { description: 'Rebar Y16', quantity: 4, unit: 't', unitPrice: 850, totalPrice: 3400, notes: null },
        { description: 'Rebar Y20', quantity: 2.5, unit: 't', unitPrice: 860, totalPrice: 2150, notes: null },
        { description: 'Ready-mix concrete C40', quantity: 120, unit: 'm³', unitPrice: 110, totalPrice: 13200, notes: 'East bay slab' },
      ],
    },
    {
      poNumber: 'PO-TH-102',
      projectId: thId,
      supplier: 'Volt MEP Distributors',
      orderDate: daysAgo(6),
      expectedDeliveryDate: daysFromNow(2),
      notes: 'MEP first-fix materials, level 5.',
      items: [
        { description: 'PVC conduit 25mm', quantity: 600, unit: 'm', unitPrice: 1.8, totalPrice: 1080, notes: null },
        { description: 'Galvanised cable tray 300mm', quantity: 120, unit: 'm', unitPrice: 14, totalPrice: 1680, notes: null },
      ],
    },
    {
      poNumber: 'PO-GV-201',
      projectId: gvId,
      supplier: 'Apex Building Supplies',
      orderDate: daysAgo(5),
      expectedDeliveryDate: daysFromNow(3),
      notes: 'Sub-base aggregate for site access road.',
      items: [
        { description: 'Crushed stone (sub-base)', quantity: 200, unit: 'm³', unitPrice: 28, totalPrice: 5600, notes: null },
      ],
    },
  ];

  const poIds: Record<string, string> = {};
  for (const def of poDefs) {
    const { supplier, items, ...rest } = def;
    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);
    const doc = await PurchaseOrder.findOneAndUpdate(
      { organizationId: orgId, poNumber: def.poNumber },
      {
        $setOnInsert: {
          organizationId: orgId,
          supplierId: supplierIds[supplier],
          status: PurchaseOrderStatus.APPROVED,
          approvedById: pmId,
          approvedAt: daysAgo(4),
          currency: 'USD',
          totalAmount,
          items,
          ...rest,
        },
      },
      { upsert: true, new: true },
    );
    poIds[def.poNumber] = doc!._id.toString();
  }
  console.log(`  Purchase orders: ${poDefs.length} upserted`);

  // Deterministic _ids keep deliveries idempotent (they carry no natural key).
  const deliveryDefs = [
    {
      _id: 'seed-dlv-th-101-a',
      poNumber: 'PO-TH-101',
      status: DeliveryStatus.DELIVERED,
      deliveryDate: daysAgo(1),
      receivedById: engId,
      notes: 'Rebar bundles received and checked against the PO. Tags verified.',
    },
    {
      _id: 'seed-dlv-th-101-b',
      poNumber: 'PO-TH-101',
      status: DeliveryStatus.IN_TRANSIT,
      deliveryDate: daysFromNow(1),
      receivedById: null,
      notes: 'Ready-mix scheduled — pump truck booked.',
    },
    {
      _id: 'seed-dlv-th-102-a',
      poNumber: 'PO-TH-102',
      status: DeliveryStatus.PENDING,
      deliveryDate: daysFromNow(2),
      receivedById: null,
      notes: null,
    },
    {
      _id: 'seed-dlv-th-102-b',
      poNumber: 'PO-TH-102',
      status: DeliveryStatus.DELAYED,
      deliveryDate: daysAgo(1),
      receivedById: null,
      notes: 'Cable tray back-ordered — supplier advised 3-day slip.',
    },
    {
      _id: 'seed-dlv-gv-201-a',
      poNumber: 'PO-GV-201',
      status: DeliveryStatus.PENDING,
      deliveryDate: daysFromNow(3),
      receivedById: null,
      notes: null,
    },
    {
      _id: 'seed-dlv-gv-201-b',
      poNumber: 'PO-GV-201',
      status: DeliveryStatus.DELIVERED,
      deliveryDate: daysAgo(2),
      receivedById: engId,
      notes: 'First aggregate load received; spread for access road formation.',
    },
  ];

  let deliveryCount = 0;
  for (const def of deliveryDefs) {
    const { _id, poNumber, ...rest } = def;
    await upsert(
      Delivery,
      { _id },
      { _id, organizationId: orgId, purchaseOrderId: poIds[poNumber], ...rest },
    );
    deliveryCount++;
  }
  console.log(`  Deliveries: ${deliveryCount} upserted`);

  console.log('\nSite Engineer demo data seed complete.');
  console.log('  Log in as engineer@constructiq.com / Demo@1234 and open /site-eng/*');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
