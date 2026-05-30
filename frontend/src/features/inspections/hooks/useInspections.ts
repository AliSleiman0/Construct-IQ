import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inspectionsApi } from '@/lib/api/inspections.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  InspectionListParams,
  CreateInspectionPayload,
  UpdateInspectionPayload,
} from '@/types/inspection.types';

export function useInspections(params?: InspectionListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['inspections', params ?? {}],
    queryFn: () => inspectionsApi.list(params),
    enabled: isAuthenticated,
  });
}

export function useInspection(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['inspections', 'detail', id],
    queryFn: () => inspectionsApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });
}

function useInvalidateInspections() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['inspections'] });
}

export function useCreateInspection() {
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: (payload: CreateInspectionPayload) => inspectionsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateInspection() {
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInspectionPayload }) =>
      inspectionsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteInspection() {
  const invalidate = useInvalidateInspections();
  return useMutation({
    mutationFn: (id: string) => inspectionsApi.delete(id),
    onSuccess: invalidate,
  });
}
