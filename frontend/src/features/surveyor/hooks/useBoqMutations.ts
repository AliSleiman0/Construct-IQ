import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boqApi } from '@/lib/api/boq.api';
import type { CreateBoqPayload, UpdateBoqPayload } from '@/types/boq.types';

function useInvalidateBoq() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['boq'] });
}

export function useCreateBoqItem() {
  const invalidate = useInvalidateBoq();
  return useMutation({
    mutationFn: (payload: CreateBoqPayload) => boqApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateBoqItem() {
  const invalidate = useInvalidateBoq();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBoqPayload }) => boqApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteBoqItem() {
  const invalidate = useInvalidateBoq();
  return useMutation({
    mutationFn: (id: string) => boqApi.delete(id),
    onSuccess: invalidate,
  });
}
