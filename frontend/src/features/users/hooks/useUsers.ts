import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users.api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: usersApi.listRoles,
  });
}
