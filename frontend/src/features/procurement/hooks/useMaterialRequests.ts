import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialRequestsApi } from '@/lib/api/materialRequests.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  CreateMaterialRequestPayload,
  ReviewMaterialRequestPayload,
  ConvertMaterialRequestPayload,
} from '@/types/procurement.types';

export function useMaterialRequests(projectId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['material-requests', projectId ?? null],
    queryFn: () => materialRequestsApi.list(projectId ? { projectId } : undefined),
    enabled: isAuthenticated,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['material-requests'] });
}

export function useCreateMaterialRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CreateMaterialRequestPayload) => materialRequestsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateMaterialRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateMaterialRequestPayload> }) =>
      materialRequestsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useApproveMaterialRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      materialRequestsApi.approve(id, { reviewNote }),
    onSuccess: invalidate,
  });
}

export function useRejectMaterialRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      materialRequestsApi.reject(id, { reviewNote }),
    onSuccess: invalidate,
  });
}

export function useConvertMaterialRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConvertMaterialRequestPayload }) =>
      materialRequestsApi.convert(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteMaterialRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => materialRequestsApi.delete(id),
    onSuccess: invalidate,
  });
}
