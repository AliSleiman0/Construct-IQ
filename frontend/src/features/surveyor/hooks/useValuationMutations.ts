import { useMutation, useQueryClient } from '@tanstack/react-query';
import { valuationsApi } from '@/lib/api/valuations.api';
import type { CreateValuationPayload, UpdateValuationPayload } from '@/types/valuation.types';

function useInvalidateValuations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['valuations'] });
}

export function useCreateValuation() {
  const invalidate = useInvalidateValuations();
  return useMutation({
    mutationFn: (payload: CreateValuationPayload) => valuationsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateValuation() {
  const invalidate = useInvalidateValuations();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateValuationPayload }) => valuationsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useCertifyValuation() {
  const invalidate = useInvalidateValuations();
  return useMutation({
    mutationFn: (id: string) => valuationsApi.certify(id),
    onSuccess: invalidate,
  });
}
