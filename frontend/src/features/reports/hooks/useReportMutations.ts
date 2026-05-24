import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports.api';
import { aiApi } from '@/features/ai/api/ai.client';
import type { CreateReportPayload, UpdateReportPayload } from '@/types/report.types';

// Invalidate every reports query variant (project list, org-wide list, detail).
function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['reports'] });
}

export function useCreateReport(projectId: string) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (payload: Omit<CreateReportPayload, 'projectId'>) =>
      reportsApi.create({ ...payload, projectId }),
    onSuccess: invalidate,
  });
}

export function useUpdateReport(_projectId?: string) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReportPayload }) =>
      reportsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useSummarizeReport() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (reportId: string) => aiApi.summarizeReport(reportId),
    onSuccess: invalidate,
  });
}
