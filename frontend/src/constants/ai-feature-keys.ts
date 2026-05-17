/**
 * Frontend mirror of backend/src/common/constants/ai-features.ts
 *
 * Use these to gate AI UI by what's included in the org's AI subscription:
 *   const { hasAiFeature } = useAiFeatures();
 *   if (hasAiFeature(AI_FEATURE_KEYS.AI_ASSISTANT)) { ... }
 */

export const AI_FEATURE_KEYS = {
  AI_ASSISTANT: 'ai_assistant',
  AI_REPORT_SUMMARY: 'ai_report_summary',
  AI_SUPPLIER_SEARCH: 'ai_supplier_search',
  AI_DOC_SEARCH: 'ai_doc_search',
  AI_RISK_DETECTION: 'ai_risk_detection',
  AI_TAKEOFF: 'ai_takeoff',
} as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[keyof typeof AI_FEATURE_KEYS];
