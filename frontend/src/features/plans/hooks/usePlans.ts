import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi, type PlanPayload } from '@/lib/api/plans.api';
import { useSnackbar } from 'notistack';

export function usePlans(includeInactive = false) {
  return useQuery({
    queryKey: ['plans', { includeInactive }],
    queryFn: () => plansApi.list(includeInactive),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: PlanPayload) => plansApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      enqueueSnackbar('Plan created successfully.', { variant: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create plan.';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PlanPayload> }) =>
      plansApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      enqueueSnackbar('Plan updated.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to update plan.', { variant: 'error' });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      enqueueSnackbar('Plan deleted.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to delete plan.', { variant: 'error' });
    },
  });
}
