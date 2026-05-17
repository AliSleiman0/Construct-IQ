import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useCompanyStore } from '@/store/company.store';
import { aiPlansApi } from '@/lib/api/ai-plans.api';
import { organizationsApi } from '@/lib/api/organizations.api';
import type { AiFeatureKey } from '@/constants/ai-feature-keys';

/**
 * Resolves the current org's AI subscription and returns the set of AI
 * feature keys it includes.
 *
 * Usage:
 *   const { hasAiFeature, aiFeatureKeys, isLoading } = useAiFeatures();
 *   if (hasAiFeature('ai_assistant')) { ... }
 *   if (hasAiFeature(AI_FEATURE_KEYS.AI_TAKEOFF)) { ... }
 *
 * Super Admins have access to every AI feature.
 *
 * Gated on `isAuthenticated` so it never fires from a provider mount before
 * login (which would 401 → refresh fail → /login redirect loop).
 */
export function useAiFeatures() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const orgId = useCompanyStore((s) => s.selectedCompany?.id ?? '');

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['org-for-ai-features', orgId],
    queryFn: () => organizationsApi.getById(orgId),
    enabled: isAuthenticated && !!orgId && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const aiPlanId = (org as any)?.aiPlanId ?? null;

  const { data: aiPlan, isLoading: planLoading } = useQuery({
    queryKey: ['ai-plan-features', aiPlanId],
    queryFn: () =>
      aiPlansApi.list(false).then((plans) => plans.find((p: any) => p._id === aiPlanId) ?? null),
    enabled: isAuthenticated && !!aiPlanId && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const aiFeatureKeys: string[] = isSuperAdmin
    ? ['*']
    : Array.isArray((aiPlan as any)?.features) ? (aiPlan as any).features : [];

  const hasAiFeature = (key: AiFeatureKey | string): boolean => {
    if (isSuperAdmin) return true;
    return aiFeatureKeys.includes(key);
  };

  return {
    aiFeatureKeys,
    hasAiFeature,
    isLoading: orgLoading || planLoading,
    aiPlanId,
  };
}
