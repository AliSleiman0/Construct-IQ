import { useQuery } from '@tanstack/react-query';
import { boqApi } from '@/lib/api/boq.api';
import { useAuthStore } from '@/store/auth.store';

export function useBoqItems(projectId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['boq', projectId],
    queryFn: () => boqApi.list({ projectId }),
    enabled: isAuthenticated && !!projectId,
  });
}
