import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports.api';
import type { CreateReportPayload, UpdateReportPayload } from '@/types/report.types';

export function useCreateReport(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports', projectId] }),
  });
}

export function useUpdateReport(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReportPayload }) =>
      reportsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports', projectId] }),
  });
}
