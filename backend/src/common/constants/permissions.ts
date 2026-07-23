/**
 * Permission name constants — matches the `name` field in the `permissions` table.
 * Format: `action:resource`
 *
 * Use @RequirePermissions(PERMISSIONS.PROJECTS.READ) in controllers.
 * Never use raw strings like 'read:projects' — always use these constants.
 */
export const PERMISSIONS = {
  // ── Wildcard ──────────────────────────────────────────────
  ALL: 'manage:all',

  // ── Company-scoped wildcard (Admin role) ──────────────────
  COMPANY: {
    MANAGE: 'manage:company',
  },

  // ── Organizations ─────────────────────────────────────────
  ORGANIZATIONS: {
    READ: 'read:organizations',
    UPDATE: 'update:organizations',
    MANAGE: 'manage:organizations',
  },

  // ── Users & Roles ─────────────────────────────────────────
  USERS: {
    READ: 'read:users',
    CREATE: 'create:users',
    UPDATE: 'update:users',
    DELETE: 'delete:users',
    MANAGE: 'manage:users',
  },
  ROLES: {
    READ: 'read:roles',
    MANAGE: 'manage:roles',
  },

  // ── Projects ──────────────────────────────────────────────
  PROJECTS: {
    READ: 'read:projects',
    CREATE: 'create:projects',
    UPDATE: 'update:projects',
    DELETE: 'delete:projects',
    MANAGE: 'manage:projects',
    ASSIGN_MEMBERS: 'assign:project_members',
  },

  // ── Phases & Milestones ───────────────────────────────────
  PHASES: {
    READ: 'read:phases',
    MANAGE: 'manage:phases',
  },
  MILESTONES: {
    READ: 'read:milestones',
    MANAGE: 'manage:milestones',
  },

  // ── Tasks ─────────────────────────────────────────────────
  TASKS: {
    READ: 'read:tasks',
    CREATE: 'create:tasks',
    UPDATE: 'update:tasks',
    DELETE: 'delete:tasks',
    ASSIGN: 'assign:tasks',
    MANAGE: 'manage:tasks',
  },

  // ── Daily Reports ─────────────────────────────────────────
  REPORTS: {
    READ: 'read:reports',
    CREATE: 'create:reports',
    UPDATE: 'update:reports',
    MANAGE: 'manage:reports',
  },

  // ── Issues ────────────────────────────────────────────────
  ISSUES: {
    READ: 'read:issues',
    CREATE: 'create:issues',
    UPDATE: 'update:issues',
    ASSIGN: 'assign:issues',
    MANAGE: 'manage:issues',
  },

  // ── Inspections ───────────────────────────────────────────
  INSPECTIONS: {
    READ: 'read:inspections',
    CREATE: 'create:inspections',
    UPDATE: 'update:inspections',
    MANAGE: 'manage:inspections',
  },

  // ── RFIs (Requests For Information) ───────────────────────
  RFIS: {
    READ: 'read:rfis',
    CREATE: 'create:rfis',
    UPDATE: 'update:rfis',
    MANAGE: 'manage:rfis',
  },

  // ── Budget ────────────────────────────────────────────────
  BUDGET: {
    READ: 'read:budget',
    MANAGE: 'manage:budget',
  },

  // ── Suppliers ─────────────────────────────────────────────
  SUPPLIERS: {
    READ: 'read:suppliers',
    MANAGE: 'manage:suppliers',
  },

  // ── Purchase Orders ───────────────────────────────────────
  PURCHASE_ORDERS: {
    READ: 'read:purchase_orders',
    CREATE: 'create:purchase_orders',
    UPDATE: 'update:purchase_orders',
    APPROVE: 'approve:purchase_orders',
    REJECT: 'reject:purchase_orders',
    MANAGE: 'manage:purchase_orders',
  },

  // ── Material Requests ─────────────────────────────────────
  MATERIAL_REQUESTS: {
    READ: 'read:material_requests',
    CREATE: 'create:material_requests',
    APPROVE: 'approve:material_requests',
    MANAGE: 'manage:material_requests',
  },

  // ── Deliveries ────────────────────────────────────────────
  DELIVERIES: {
    READ: 'read:deliveries',
    UPDATE: 'update:deliveries',
    CONFIRM: 'confirm:deliveries',
    MANAGE: 'manage:deliveries',
  },

  // ── Documents ─────────────────────────────────────────────
  DOCUMENTS: {
    READ: 'read:documents',
    UPLOAD: 'upload:documents',
    DELETE: 'delete:documents',
    MANAGE: 'manage:documents',
  },

  // ── AI ────────────────────────────────────────────────────
  AI: {
    READ: 'read:ai',
    USE: 'use:ai',
  },

  // ── Bids (Subcontractor Bid Analyzer) ─────────────────────
  BIDS: {
    READ: 'read:bids',
    CREATE: 'create:bids',
    UPDATE: 'update:bids',
    DELETE: 'delete:bids',
    MANAGE: 'manage:bids',
  },

  // ── Support Tickets ───────────────────────────────────────
  TICKETS: {
    READ: 'read:tickets',
    CREATE: 'create:tickets',
    MANAGE: 'manage:tickets',
  },

  // ── Audit Logs ────────────────────────────────────────────
  AUDIT_LOGS: {
    READ: 'read:audit_logs',
  },

  // ── Settings ────────────────────────────────────────────
  SETTINGS: {
    READ: 'read:settings',
    UPDATE: 'update:settings',
    MANAGE: 'manage:settings',
  },

  // ── Dashboard ───────────────────────────────────────────
  DASHBOARD: {
    READ: 'read:dashboard',
  },
} as const;

/** Flat union type of all permission strings */
export type PermissionName = string;

/**
 * The seedable catalog — one row per permission, carrying the metadata the
 * `permissions` collection stores.
 *
 * This exists because `OrganizationsService.create()` filters every role's
 * grants against the names actually present in that collection
 * (`knownPermissionNames`). A permission that PERMISSIONS declares but the
 * catalog omits is silently dropped from every org provisioned through the API
 * — which is exactly how the `inspections` keys went missing for non-seed orgs.
 *
 * `scripts/seed.ts` and `scripts/sync-role-permissions.ts` both iterate this
 * array, so there is one list, not three. `permissions.catalog.spec.ts` fails
 * the build if a PERMISSIONS value has no row here.
 */
export interface PermissionDef {
  name: string;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
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

  { name: 'read:inspections', resource: 'inspections', action: 'read', description: 'View inspections' },
  { name: 'create:inspections', resource: 'inspections', action: 'create', description: 'Raise inspections' },
  { name: 'update:inspections', resource: 'inspections', action: 'update', description: 'Edit inspections and record results' },
  { name: 'manage:inspections', resource: 'inspections', action: 'manage', description: 'Full inspection management' },

  { name: 'read:rfis', resource: 'rfis', action: 'read', description: 'View RFIs' },
  { name: 'create:rfis', resource: 'rfis', action: 'create', description: 'Raise RFIs' },
  { name: 'update:rfis', resource: 'rfis', action: 'update', description: 'Edit RFIs' },
  { name: 'manage:rfis', resource: 'rfis', action: 'manage', description: 'Full RFI management incl. answering' },

  { name: 'read:budget', resource: 'budget', action: 'read', description: 'View budget' },
  { name: 'manage:budget', resource: 'budget', action: 'manage', description: 'Full budget management' },

  { name: 'read:suppliers', resource: 'suppliers', action: 'read', description: 'View suppliers' },
  { name: 'manage:suppliers', resource: 'suppliers', action: 'manage', description: 'Full supplier management' },

  { name: 'read:purchase_orders', resource: 'purchase_orders', action: 'read', description: 'View purchase orders' },
  { name: 'create:purchase_orders', resource: 'purchase_orders', action: 'create', description: 'Create purchase orders' },
  { name: 'update:purchase_orders', resource: 'purchase_orders', action: 'update', description: 'Edit purchase orders' },
  { name: 'approve:purchase_orders', resource: 'purchase_orders', action: 'approve', description: 'Approve purchase orders' },
  { name: 'reject:purchase_orders', resource: 'purchase_orders', action: 'reject', description: 'Reject purchase orders' },
  { name: 'manage:purchase_orders', resource: 'purchase_orders', action: 'manage', description: 'Full purchase order management' },

  { name: 'read:material_requests', resource: 'material_requests', action: 'read', description: 'View material requests' },
  { name: 'create:material_requests', resource: 'material_requests', action: 'create', description: 'Create material requests' },
  { name: 'approve:material_requests', resource: 'material_requests', action: 'approve', description: 'Approve/reject material requests' },
  { name: 'manage:material_requests', resource: 'material_requests', action: 'manage', description: 'Full material request management' },

  { name: 'read:deliveries', resource: 'deliveries', action: 'read', description: 'View deliveries' },
  { name: 'update:deliveries', resource: 'deliveries', action: 'update', description: 'Update delivery status' },
  { name: 'confirm:deliveries', resource: 'deliveries', action: 'confirm', description: 'Confirm goods received on site' },
  { name: 'manage:deliveries', resource: 'deliveries', action: 'manage', description: 'Full delivery management' },

  { name: 'read:documents', resource: 'documents', action: 'read', description: 'View documents' },
  { name: 'upload:documents', resource: 'documents', action: 'upload', description: 'Upload documents' },
  { name: 'delete:documents', resource: 'documents', action: 'delete', description: 'Delete documents' },
  { name: 'manage:documents', resource: 'documents', action: 'manage', description: 'Full document management' },

  { name: 'read:ai', resource: 'ai', action: 'read', description: 'View AI insights and summaries' },
  { name: 'use:ai', resource: 'ai', action: 'use', description: 'Use AI assistant and generate summaries' },

  { name: 'read:bids', resource: 'bids', action: 'read', description: 'View subcontractor bids' },
  { name: 'create:bids', resource: 'bids', action: 'create', description: 'Upload and analyze bid PDFs' },
  { name: 'update:bids', resource: 'bids', action: 'update', description: 'Edit bid records' },
  { name: 'delete:bids', resource: 'bids', action: 'delete', description: 'Delete bid records' },
  { name: 'manage:bids', resource: 'bids', action: 'manage', description: 'Full subcontractor bid management' },

  { name: 'read:tickets', resource: 'tickets', action: 'read', description: 'View support tickets' },
  { name: 'create:tickets', resource: 'tickets', action: 'create', description: 'Raise support tickets' },
  { name: 'manage:tickets', resource: 'tickets', action: 'manage', description: 'Triage and resolve support tickets' },

  { name: 'read:audit_logs', resource: 'audit_logs', action: 'read', description: 'View audit logs' },

  { name: 'read:settings', resource: 'settings', action: 'read', description: 'View organization settings' },
  { name: 'update:settings', resource: 'settings', action: 'update', description: 'Update organization settings' },
  { name: 'manage:settings', resource: 'settings', action: 'manage', description: 'Full settings management' },

  { name: 'read:dashboard', resource: 'dashboard', action: 'read', description: 'View organization dashboard' },
];

/** Every permission string declared in PERMISSIONS, flattened. */
export function allPermissionNames(): string[] {
  const walk = (node: unknown): string[] =>
    typeof node === 'string'
      ? [node]
      : Object.values(node as Record<string, unknown>).flatMap(walk);
  return walk(PERMISSIONS);
}
