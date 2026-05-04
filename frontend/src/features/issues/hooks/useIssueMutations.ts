import { useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api/issues.api';
import type { CreateIssuePayload, UpdateIssuePayload } from '@/types/issue.types';

export function useCreateIssue(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateIssuePayload) => issuesApi.create(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues', projectId] }),
  });
}

export function useUpdateIssue(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateIssuePayload }) =>
      issuesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues', projectId] }),
  });
}

export function useDeleteIssue(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => issuesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues', projectId] }),
  });
}
