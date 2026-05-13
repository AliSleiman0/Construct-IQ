/**
 * Frontend mirror of backend/src/common/constants/platform-features.ts
 *
 * Use these constants wherever you need to conditionally show UI based on
 * the org's plan features. They are plain strings so nothing breaks if a
 * key doesn't exist in the DB yet.
 *
 * Example:
 *   const { hasFeature } = useOrgFeatures();
 *   if (hasFeature(FEATURE_KEYS.AI_ASSISTANT)) { ... }
 */

export const FEATURE_KEYS = {
  // Reporting
  DAILY_REPORTS: 'daily_reports',
  AI_REPORT_SUMMARY: 'ai_report_summary',

  // AI & Search
  AI_SUPPLIER_SEARCH: 'ai_supplier_search',
  AI_ASSISTANT: 'ai_assistant',

  // Project Management
  UNLIMITED_PROJECTS: 'unlimited_projects',
  ADVANCED_SCHEDULING: 'advanced_scheduling',

  // Finance & Procurement
  BUDGET_MANAGEMENT: 'budget_management',
  PURCHASE_ORDERS: 'purchase_orders',
  QUANTITY_SURVEYING: 'quantity_surveying',

  // Client Portal
  CLIENT_PORTAL: 'client_portal',
  PAYMENT_SCHEDULES: 'payment_schedules',

  // Documents & Storage
  DOCUMENT_MANAGEMENT: 'document_management',

  // Support
  PRIORITY_SUPPORT: 'priority_support',
  AUDIT_LOG: 'audit_log',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
