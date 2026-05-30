import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi } from '@/lib/api/deliveries.api';
import { useAuthStore } from '@/store/auth.store';
import type { CreateDeliveryPayload, UpdateDeliveryPayload, ConfirmDeliveryPayload } from '@/types/procurement.types';

export function useDeliveries() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: () => deliveriesApi.list(),
    enabled: isAuthenticated,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['deliveries'] });
}

export function useCreateDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CreateDeliveryPayload) => deliveriesApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeliveryPayload }) =>
      deliveriesApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deliveriesApi.delete(id),
    onSuccess: invalidate,
  });
}

export function useConfirmDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConfirmDeliveryPayload }) =>
      deliveriesApi.confirm(id, payload),
    onSuccess: invalidate,
  });
}
