import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';

export function useClientPortal(projectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['projects', projectId, 'client-portal'];

  const { data: portalInfo, isLoading } = useQuery({
    queryKey,
    queryFn: () => projectsApi.getClientPortalInfo(projectId!),
    enabled: !!projectId,
  });

  const { mutate: regenerate, isPending: isRegenerating } = useMutation({
    mutationFn: () => projectsApi.regenerateClientPortalToken(projectId!),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  return { portalInfo, isLoading, regenerate, isRegenerating };
}
