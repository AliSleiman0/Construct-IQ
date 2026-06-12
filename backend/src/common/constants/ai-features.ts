/**
 * AI feature catalog — the authoritative list of sellable AI capabilities.
 *
 * Runs parallel to platform-features.ts. AI is a separate product line with
 * its own subscription (AiPlan), so AI feature keys live here rather than
 * mixed in with core PM features.
 *
 * HOW IT WORKS:
 *   1. Every entry below is auto-synced to the `ai_features` collection on
 *      server startup via AiFeaturesService.onModuleInit().
 *   2. Super Admin can edit name/description in the UI; those edits persist
 *      and are NOT overwritten on restart (only missing keys are inserted).
 *   3. Use the `key` values in @RequireAiFeature() on AI routes, or with
 *      useAiFeatures() on the frontend to conditionally show AI UI.
 *
 * ADDING A NEW AI FEATURE:
 *   1. Add an entry below.
 *   2. Restart the server — it auto-inserts the new key.
 *   3. Assign it to AI plan tiers from /super-admin/ai-plans.
 */

export interface AiFeatureDefinition {
  key: string;
  name: string;
  description: string;
  /** Roadmap features ship inactive — visible in the catalog UI but cannot be
   *  added to any AiPlan until SA toggles them on. */
  isActive?: boolean;
}

export const AI_FEATURES = {
  AI_ASSISTANT: {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'Natural-language chat assistant for navigation, summaries, and insights.',
    isActive: true,
  },
  AI_REPORT_SUMMARY: {
    key: 'ai_report_summary',
    name: 'AI Report Summary',
    description: 'AI-generated summaries for daily site reports.',
    isActive: true,
  },
  AI_SUPPLIER_SEARCH: {
    key: 'ai_supplier_search',
    name: 'AI Supplier Search',
    description: 'Find nearby suppliers automatically using AI-powered geolocation search.',
    isActive: true,
  },
  AI_DOC_SEARCH: {
    key: 'ai_doc_search',
    name: 'AI Document Search',
    description: 'Semantic search across project documents, drawings, and contracts.',
    isActive: false,
  },
  AI_RISK_DETECTION: {
    key: 'ai_risk_detection',
    name: 'AI Risk Detection',
    description: 'Automatically flag schedule, budget, and safety risks from project data.',
    isActive: false,
  },
  AI_TAKEOFF: {
    key: 'ai_takeoff',
    name: 'AI Quantity Takeoff',
    description: 'Estimate quantities directly from construction drawings with AI vision.',
    isActive: false,
  },
  AI_BID_ANALYSIS: {
    key: 'ai_bid_analysis',
    name: 'AI Subcontractor Bid Analyzer',
    description: 'Extract price, terms, warranties, and red flags from subcontractor bid PDFs and compare them side-by-side.',
    isActive: true,
  },
} as const satisfies Record<string, AiFeatureDefinition>;

/** Union type of all valid AI feature keys — use this for type-safe checks. */
export type AiFeatureKey = (typeof AI_FEATURES)[keyof typeof AI_FEATURES]['key'];

/** Flat array of all definitions — used by the seeder. */
export const ALL_AI_FEATURE_DEFINITIONS: AiFeatureDefinition[] = Object.values(AI_FEATURES);
