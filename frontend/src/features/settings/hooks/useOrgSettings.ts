import { useQuery } from '@tanstack/react-query';
import { orgSettingsApi } from '@/lib/api/org-settings.api';
import { useAuthStore } from '@/store/auth.store';

export function useOrgSettings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['org-settings'],
    queryFn: orgSettingsApi.get,
    enabled: isAuthenticated,
  });
}
