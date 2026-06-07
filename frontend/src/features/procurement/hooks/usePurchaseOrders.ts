import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi } from '@/lib/api/purchaseOrders.api';
import { useAuthStore } from '@/store/auth.store';
import type { CreatePurchaseOrderPayload, PurchaseOrderStatus } from '@/types/procurement.types';

export interface UpdatePurchaseOrderPayload {
  status?: PurchaseOrderStatus;
  expectedDeliveryDate?: string;
  notes?: string;
  items?: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number; unit?: string }>;
  totalAmount?: number;
}

export function usePurchaseOrders(projectId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['purchase-orders', projectId ?? null],
    queryFn: () => purchaseOrdersApi.list(projectId ? { projectId } : undefined),
    enabled: isAuthenticated,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['purchase-orders'] });
}

export function useUpdatePO() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePurchaseOrderPayload }) =>
      purchaseOrdersApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useCreatePO() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => purchaseOrdersApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useApprovePO() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.approve(id),
    onSuccess: invalidate,
  });
}

export function useRejectPO() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => purchaseOrdersApi.reject(id, reason),
    onSuccess: invalidate,
  });
}

export function useDeletePO() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.delete(id),
    onSuccess: invalidate,
  });
}
