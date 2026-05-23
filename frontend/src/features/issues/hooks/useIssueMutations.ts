import { useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api/issues.api';
import type { CreateIssuePayload, UpdateIssuePayload } from '@/types/issue.types';

// Invalidate every issues query variant (project list, org-wide list, detail).
function useInvalidateIssues() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['issues'] });
}

export function useCreateIssue(projectId: string) {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: (payload: Omit<CreateIssuePayload, 'projectId'>) =>
      issuesApi.create({ ...payload, projectId }),
    onSuccess: invalidate,
  });
}

export function useUpdateIssue(_projectId?: string) {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateIssuePayload }) =>
      issuesApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteIssue(_projectId?: string) {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: (id: string) => issuesApi.delete(id),
    onSuccess: invalidate,
  });
}

export function useAddIssueComment() {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => issuesApi.addComment(id, body),
    onSuccess: invalidate,
  });
}

export function useAssignIssue() {
  const invalidate = useInvalidateIssues();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      issuesApi.assign(id, assignedToId),
    onSuccess: invalidate,
  });
}
