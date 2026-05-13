import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });
}
