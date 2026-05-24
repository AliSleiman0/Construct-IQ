import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { milestonesApi } from '@/lib/api/milestones.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  CreateMilestonePayload,
  UpdateMilestonePayload,
} from '@/types/milestone.types';

export function useMilestones(projectId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.listByProject(projectId!),
    enabled: isAuthenticated && !!projectId,
  });
}

function useInvalidateMilestones(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
}

export function useCreateMilestone(projectId: string) {
  const invalidate = useInvalidateMilestones(projectId);
  return useMutation({
    mutationFn: (payload: CreateMilestonePayload) =>
      milestonesApi.create(projectId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMilestone(projectId: string) {
  const invalidate = useInvalidateMilestones(projectId);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMilestonePayload }) =>
      milestonesApi.update(projectId, id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteMilestone(projectId: string) {
  const invalidate = useInvalidateMilestones(projectId);
  return useMutation({
    mutationFn: (id: string) => milestonesApi.delete(projectId, id),
    onSuccess: () => invalidate(),
  });
}
