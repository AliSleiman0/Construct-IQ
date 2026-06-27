import { useMutation, useQueryClient } from '@tanstack/react-query';
import { variationsApi } from '@/lib/api/variations.api';
import type { CreateVariationPayload, UpdateVariationPayload } from '@/types/variation.types';

function useInvalidateVariations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['variations'] });
}

export function useCreateVariation() {
  const invalidate = useInvalidateVariations();
  return useMutation({
    mutationFn: (payload: CreateVariationPayload) => variationsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateVariation() {
  const invalidate = useInvalidateVariations();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVariationPayload }) => variationsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useApproveVariation() {
  const invalidate = useInvalidateVariations();
  return useMutation({
    mutationFn: (id: string) => variationsApi.approve(id),
    onSuccess: invalidate,
  });
}

export function useRejectVariation() {
  const invalidate = useInvalidateVariations();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => variationsApi.reject(id, reason),
    onSuccess: invalidate,
  });
}

export function useDeleteVariation() {
  const invalidate = useInvalidateVariations();
  return useMutation({
    mutationFn: (id: string) => variationsApi.delete(id),
    onSuccess: invalidate,
  });
}
