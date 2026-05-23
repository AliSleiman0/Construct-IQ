import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';
import { useAuthStore } from '@/store/auth.store';

export function useProjects() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    enabled: isAuthenticated,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });
}
