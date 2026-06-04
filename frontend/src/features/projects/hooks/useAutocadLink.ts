import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';

export function useAutocadLink(projectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['projects', projectId, 'autocad-link'];

  const { data: linkInfo, isLoading } = useQuery({
    queryKey,
    queryFn: () => projectsApi.getAutocadLinkInfo(projectId!),
    enabled: !!projectId,
  });

  const { mutate: regenerate, isPending: isRegenerating } = useMutation({
    mutationFn: () => projectsApi.regenerateAutocadToken(projectId!),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  return { linkInfo, isLoading, regenerate, isRegenerating };
}
