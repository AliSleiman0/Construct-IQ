import { useQuery } from '@tanstack/react-query';
import { orgSettingsApi } from '@/lib/api/org-settings.api';

export function useOrgSettings() {
  return useQuery({
    queryKey: ['org-settings'],
    queryFn: orgSettingsApi.get,
  });
}
