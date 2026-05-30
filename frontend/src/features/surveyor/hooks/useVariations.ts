import { useQuery } from '@tanstack/react-query';
import { variationsApi } from '@/lib/api/variations.api';
import { useAuthStore } from '@/store/auth.store';

export function useVariations(projectId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['variations', projectId],
    queryFn: () => variationsApi.list({ projectId }),
    enabled: isAuthenticated && !!projectId,
  });
}
