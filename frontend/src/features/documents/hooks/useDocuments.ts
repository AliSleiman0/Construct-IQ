import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents.api';
import { useAuthStore } from '@/store/auth.store';

export function useDocuments(projectId?: string, type?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['documents', projectId ?? null, type ?? null],
    queryFn: () => documentsApi.list({ projectId, type }),
    enabled: isAuthenticated && !!projectId,
  });
}

/** Documents attached to a daily report (SE-5 — used for the report photo gallery). */
export function useReportPhotos(reportId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['documents', { dailyReportId: reportId ?? null }],
    queryFn: () => documentsApi.list({ dailyReportId: reportId }),
    enabled: isAuthenticated && !!reportId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['documents'] });
}

export function useUploadDocument() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: { projectId?: string; type?: string; name?: string; description?: string; dailyReportId?: string } }) =>
      documentsApi.upload(file, meta),
    onSuccess: invalidate,
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: invalidate,
  });
}
