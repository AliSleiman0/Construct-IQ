import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users.api';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  CreateOrgAdminPayload,
} from '@/types/user.types';

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useCreateOrgAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrgAdminPayload) =>
      usersApi.createOrgAdmin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'org-admins'] });
    },
  });
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersApi.update(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useAssignRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => usersApi.assignRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useRemoveRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => usersApi.removeRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
