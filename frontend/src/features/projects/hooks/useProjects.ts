import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects.api';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });
}
