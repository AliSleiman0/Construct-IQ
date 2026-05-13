import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useCompanyStore } from '@/store/company.store';
import { plansApi } from '@/lib/api/plans.api';
import { organizationsApi } from '@/lib/api/organizations.api';
import type { FeatureKey } from '@/constants/feature-keys';

/**
 * Resolves the current org's active plan and returns the set of feature keys
 * it includes.
 *
 * Usage:
 *   const { hasFeature, featureKeys, isLoading } = useOrgFeatures();
 *   if (hasFeature('ai_assistant')) { ... }
 *   if (hasFeature(FEATURE_KEYS.BUDGET_MANAGEMENT)) { ... }
 *
 * Super admins have access to every feature.
 */
export function useOrgFeatures() {
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const orgId = useCompanyStore((s) => s.selectedCompany?.id ?? '');

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['org-for-features', orgId],
    queryFn: () => organizationsApi.getById(orgId),
    enabled: !!orgId && !isSuperAdmin,
    staleTime: 5 * 60 * 1000, // 5 min — plan changes rarely
  });

  const planId = (org as any)?._id ? null : (org as any)?.planId ?? null;

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['plan-features', planId],
    queryFn: () => plansApi.list(false).then((plans) => plans.find((p: any) => p._id === planId) ?? null),
    enabled: !!planId && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const featureKeys: string[] = isSuperAdmin
    ? ['*'] // super admin has everything
    : Array.isArray((plan as any)?.features) ? (plan as any).features : [];

  const hasFeature = (key: FeatureKey | string): boolean => {
    if (isSuperAdmin) return true;
    return featureKeys.includes(key);
  };

  return {
    featureKeys,
    hasFeature,
    isLoading: orgLoading || planLoading,
    planId,
  };
}
