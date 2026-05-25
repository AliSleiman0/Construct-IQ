import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rfisApi } from '@/lib/api/rfis.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  RfiListParams,
  CreateRfiPayload,
  UpdateRfiPayload,
  AnswerRfiPayload,
} from '@/types/rfi.types';

export function useRfis(params?: RfiListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['rfis', params ?? {}],
    queryFn: () => rfisApi.list(params),
    enabled: isAuthenticated,
  });
}

export function useRfi(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['rfis', 'detail', id],
    queryFn: () => rfisApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });
}

function useInvalidateRfis() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['rfis'] });
}

export function useCreateRfi() {
  const invalidate = useInvalidateRfis();
  return useMutation({
    mutationFn: (payload: CreateRfiPayload) => rfisApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRfi() {
  const invalidate = useInvalidateRfis();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRfiPayload }) =>
      rfisApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useAnswerRfi() {
  const invalidate = useInvalidateRfis();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnswerRfiPayload }) =>
      rfisApi.answer(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteRfi() {
  const invalidate = useInvalidateRfis();
  return useMutation({
    mutationFn: (id: string) => rfisApi.delete(id),
    onSuccess: invalidate,
  });
}
