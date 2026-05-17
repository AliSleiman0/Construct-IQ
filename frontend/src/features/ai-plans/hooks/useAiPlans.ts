import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiPlansApi, type AiPlanPayload } from '@/lib/api/ai-plans.api';
import { useSnackbar } from 'notistack';

export function useAiPlans(includeInactive = false) {
  return useQuery({
    queryKey: ['ai-plans', { includeInactive }],
    queryFn: () => aiPlansApi.list(includeInactive),
  });
}

export function useCreateAiPlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: AiPlanPayload) => aiPlansApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-plans'] });
      enqueueSnackbar('AI plan created successfully.', { variant: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create AI plan.';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });
}

export function useUpdateAiPlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AiPlanPayload> }) =>
      aiPlansApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-plans'] });
      enqueueSnackbar('AI plan updated.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to update AI plan.', { variant: 'error' });
    },
  });
}

export function useDeleteAiPlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id: string) => aiPlansApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-plans'] });
      enqueueSnackbar('AI plan deleted.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to delete AI plan.', { variant: 'error' });
    },
  });
}
