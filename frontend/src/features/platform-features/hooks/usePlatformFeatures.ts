import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuresApi, type CreateFeaturePayload } from '@/lib/api/features.api';
import { useSnackbar } from 'notistack';

export const FEATURES_KEY = ['platform-features'] as const;

export function usePlatformFeatures(includeInactive = false) {
  return useQuery({
    queryKey: [...FEATURES_KEY, { includeInactive }],
    queryFn: () => featuresApi.list(includeInactive),
  });
}

export function useCreatePlatformFeature() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: CreateFeaturePayload) => featuresApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEATURES_KEY });
      enqueueSnackbar('Feature created.', { variant: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create feature.';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });
}

export function useUpdatePlatformFeature() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateFeaturePayload> }) =>
      featuresApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEATURES_KEY });
      enqueueSnackbar('Feature updated.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to update feature.', { variant: 'error' });
    },
  });
}

export function useDeletePlatformFeature() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id: string) => featuresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEATURES_KEY });
      enqueueSnackbar('Feature deleted.', { variant: 'warning' });
    },
    onError: () => {
      enqueueSnackbar('Failed to delete feature.', { variant: 'error' });
    },
  });
}
