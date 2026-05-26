import { useQuery } from '@tanstack/react-query';
import { valuationsApi } from '@/lib/api/valuations.api';
import { useAuthStore } from '@/store/auth.store';

export function useValuations(projectId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['valuations', projectId],
    queryFn: () => valuationsApi.list({ projectId }),
    enabled: isAuthenticated && !!projectId,
  });
}
