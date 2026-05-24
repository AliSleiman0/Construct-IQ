import { useQuery } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api/issues.api';
import { useAuthStore } from '@/store/auth.store';
import type { IssueListParams } from '@/types/issue.types';

/** Issues for a single project (used by the project-detail Issues tab). */
export function useIssues(projectId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'project', projectId],
    queryFn: () => issuesApi.list({ projectId: projectId! }),
    enabled: isAuthenticated && !!projectId,
  });
}

/** All org issues (legacy array helper — kept for callers that want a flat list). */
export function useAllIssues(filters?: IssueListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'all', filters ?? {}],
    queryFn: () => issuesApi.list(filters),
    enabled: isAuthenticated,
  });
}

/** Paginated org-wide triage list — backs the triage console. */
export function useIssuesPaged(params: IssueListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'paged', params],
    queryFn: () => issuesApi.listPaged(params),
    enabled: isAuthenticated,
  });
}

/** Triage summary counts (header chips / quick filters). */
export function useIssueSummary(params?: { projectId?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'summary', params ?? {}],
    queryFn: () => issuesApi.summary(params),
    enabled: isAuthenticated,
  });
}

/** A single issue by id (used by the detail page). */
export function useIssue(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'detail', id],
    queryFn: () => issuesApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });
}
