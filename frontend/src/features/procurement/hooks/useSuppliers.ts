import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '@/lib/api/suppliers.api';
import { useAuthStore } from '@/store/auth.store';
import type { CreateSupplierPayload } from '@/types/procurement.types';

export function useSuppliers() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list(),
    enabled: isAuthenticated,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['suppliers'] });
}

export function useCreateSupplier() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => suppliersApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSupplier() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateSupplierPayload> }) =>
      suppliersApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteSupplier() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: invalidate,
  });
}

export function useSupplierPerformance(supplierId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['supplier-performance', supplierId],
    queryFn: () => suppliersApi.getPerformance(supplierId!),
    enabled: isAuthenticated && !!supplierId,
  });
}
