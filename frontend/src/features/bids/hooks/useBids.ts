import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bidsApi } from '@/lib/api/bids.api';
import { useAuthStore } from '@/store/auth.store';
import type { UploadBidsPayload } from '@/types/bids.types';

export function useBids(params?: { projectId?: string; tradePackage?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['bids', params?.projectId ?? null, params?.tradePackage ?? null],
    queryFn: () => bidsApi.list(params),
    enabled: isAuthenticated,
  });
}

export function useBid(id: string | null | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['bid', id],
    queryFn: () => bidsApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });
}

function useInvalidateBids() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['bids'] });
}

export function useUploadBids() {
  const invalidate = useInvalidateBids();
  return useMutation({
    mutationFn: (payload: UploadBidsPayload) => bidsApi.upload(payload),
    onSuccess: invalidate,
  });
}

export function useDeleteBid() {
  const invalidate = useInvalidateBids();
  return useMutation({
    mutationFn: (id: string) => bidsApi.delete(id),
    onSuccess: invalidate,
  });
}
