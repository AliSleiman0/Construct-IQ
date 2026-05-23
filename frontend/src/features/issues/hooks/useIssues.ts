import { useQuery } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api/issues.api';
import { useAuthStore } from '@/store/auth.store';

/** Issues for a single project (used by the project-detail Issues tab). */
export function useIssues(projectId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'project', projectId],
    queryFn: () => issuesApi.list({ projectId: projectId! }),
    enabled: isAuthenticated && !!projectId,
  });
}

/** All org issues (used by the standalone /pm/issues triage list). */
export function useAllIssues(filters?: { status?: string; severity?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['issues', 'all', filters ?? {}],
    queryFn: () => issuesApi.list(filters),
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
