/**
 * Platform feature catalog — the authoritative list of all sellable features.
 *
 * HOW IT WORKS:
 *   1. Every entry here is auto-synced to the `features` MongoDB collection
 *      on server startup via FeaturesService.onModuleInit().
 *   2. Super admin can edit name/description in the UI — those edits persist
 *      in the DB and are NOT overwritten on restart (only missing keys are inserted).
 *   3. Use the `key` values with @RequireFeature() guard on routes, or with
 *      useOrgFeatures() on the frontend to conditionally show/hide UI.
 *
 * ADDING A NEW FEATURE:
 *   1. Add an entry below.
 *   2. Restart the server — it auto-inserts the new key into the DB.
 *   3. Assign it to plans from the Super Admin → Plans page.
 */

export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
}

export const PLATFORM_FEATURES = {
  // ── Reporting ────────────────────────────────────────────────────────────
  DAILY_REPORTS: {
    key: 'daily_reports',
    name: 'Daily Reports',
    description: 'Automated construction progress reports delivered every 24 hours.',
  },
  AI_REPORT_SUMMARY: {
    key: 'ai_report_summary',
    name: 'AI Report Summary',
    description: 'AI-generated summaries for daily site reports.',
  },

  // ── AI & Search ──────────────────────────────────────────────────────────
  AI_SUPPLIER_SEARCH: {
    key: 'ai_supplier_search',
    name: 'AI Supplier Search',
    description: 'Find nearby suppliers automatically using AI-powered geolocation search.',
  },
  AI_ASSISTANT: {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'Natural-language chat assistant for navigation, summaries, and insights.',
  },

  // ── Project Management ───────────────────────────────────────────────────
  UNLIMITED_PROJECTS: {
    key: 'unlimited_projects',
    name: 'Unlimited Projects',
    description: 'No cap on the number of active construction projects.',
  },
  ADVANCED_SCHEDULING: {
    key: 'advanced_scheduling',
    name: 'Advanced Scheduling',
    description: 'Gantt chart, critical path, and dependency tracking.',
  },

  // ── Finance & Procurement ────────────────────────────────────────────────
  BUDGET_MANAGEMENT: {
    key: 'budget_management',
    name: 'Budget Management',
    description: 'Full budget, expense tracking, and cost variance reporting.',
  },
  PURCHASE_ORDERS: {
    key: 'purchase_orders',
    name: 'Purchase Orders',
    description: 'Create, approve, and track purchase orders with suppliers.',
  },
  QUANTITY_SURVEYING: {
    key: 'quantity_surveying',
    name: 'Quantity Surveying',
    description: 'BOQ management, variations, and progress valuations.',
  },

  // ── Client Portal ────────────────────────────────────────────────────────
  CLIENT_PORTAL: {
    key: 'client_portal',
    name: 'Client Portal',
    description: 'Self-service portal for buyers to track construction progress and payments.',
  },
  PAYMENT_SCHEDULES: {
    key: 'payment_schedules',
    name: 'Payment Schedules',
    description: 'Installment-based payment tracking for property buyers.',
  },

  // ── Documents & Storage ──────────────────────────────────────────────────
  DOCUMENT_MANAGEMENT: {
    key: 'document_management',
    name: 'Document Management',
    description: 'Upload, version, and share construction documents and drawings.',
  },

  // ── Support ──────────────────────────────────────────────────────────────
  PRIORITY_SUPPORT: {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Dedicated support channel with guaranteed response time.',
  },
  AUDIT_LOG: {
    key: 'audit_log',
    name: 'Audit Log',
    description: 'Full system-wide activity log for compliance and security.',
  },
} as const satisfies Record<string, FeatureDefinition>;

/** Union type of all valid feature keys — use this for type-safe checks. */
export type FeatureKey = (typeof PLATFORM_FEATURES)[keyof typeof PLATFORM_FEATURES]['key'];

/** Flat array of all definitions — used by the seeder. */
export const ALL_FEATURE_DEFINITIONS: FeatureDefinition[] = Object.values(PLATFORM_FEATURES);
