import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiFeaturesApi, type CreateAiFeaturePayload } from '@/lib/api/ai-features.api';
import { useSnackbar } from 'notistack';

export const AI_FEATURES_KEY = ['platform-ai-features'] as const;

export function usePlatformAiFeatures(includeInactive = false) {
  return useQuery({
    queryKey: [...AI_FEATURES_KEY, { includeInactive }],
    queryFn: () => aiFeaturesApi.list(includeInactive),
  });
}

export function useCreatePlatformAiFeature() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: CreateAiFeaturePayload) => aiFeaturesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_FEATURES_KEY });
      enqueueSnackbar('AI feature created.', { variant: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create AI feature.';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });
}

export function useUpdatePlatformAiFeature() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAiFeaturePayload> }) =>
      aiFeaturesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_FEATURES_KEY });
      enqueueSnackbar('AI feature updated.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to update AI feature.', { variant: 'error' });
    },
  });
}

export function useDeletePlatformAiFeature() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id: string) => aiFeaturesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_FEATURES_KEY });
      enqueueSnackbar('AI feature deleted.', { variant: 'warning' });
    },
    onError: () => {
      enqueueSnackbar('Failed to delete AI feature.', { variant: 'error' });
    },
  });
}
