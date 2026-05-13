import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi, type CreateOrgPayload, type UpdateOrgPayload } from '@/lib/api/organizations.api';
import { useSnackbar } from 'notistack';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list(),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: CreateOrgPayload) => organizationsApi.create(payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      enqueueSnackbar(`Organization "${vars.name}" created.`, { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to create organization.', { variant: 'error' });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrgPayload }) =>
      organizationsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      enqueueSnackbar('Organization updated.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Failed to update organization.', { variant: 'error' });
    },
  });
}

export function useSetOrgActive() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      organizationsApi.setActive(id, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      enqueueSnackbar(
        vars.isActive ? 'Organization activated.' : 'Organization suspended.',
        { variant: vars.isActive ? 'success' : 'warning' },
      );
    },
    onError: () => {
      enqueueSnackbar('Failed to update organization status.', { variant: 'error' });
    },
  });
}
