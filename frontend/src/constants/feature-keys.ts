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

  // NOTE: AI feature keys are no longer in this catalog — they live in
  // ai-feature-keys.ts and are gated via useAiFeatures(), not useOrgFeatures().

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
