import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations.api';

export function useCompanies() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
    staleTime: 30_000,
  });
}

export function useOrganization(id: string | null | undefined) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationsApi.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
