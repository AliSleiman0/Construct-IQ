import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { phasesApi } from '@/lib/api/phases.api';
import { useAuthStore } from '@/store/auth.store';
import type { CreatePhasePayload, UpdatePhasePayload } from '@/types/phase.types';

export function usePhases(projectId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['phases', projectId],
    queryFn: () => phasesApi.listByProject(projectId!),
    enabled: isAuthenticated && !!projectId,
  });
}

function useInvalidatePhases(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
}

export function useCreatePhase(projectId: string) {
  const invalidate = useInvalidatePhases(projectId);
  return useMutation({
    mutationFn: (payload: CreatePhasePayload) => phasesApi.create(projectId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdatePhase(projectId: string) {
  const invalidate = useInvalidatePhases(projectId);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePhasePayload }) =>
      phasesApi.update(projectId, id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeletePhase(projectId: string) {
  const invalidate = useInvalidatePhases(projectId);
  return useMutation({
    mutationFn: (id: string) => phasesApi.delete(projectId, id),
    onSuccess: () => invalidate(),
  });
}
