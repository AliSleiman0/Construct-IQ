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

  // ── Support Tickets ───────────────────────────────────────
  TICKETS: {
    READ: 'read:tickets',
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
