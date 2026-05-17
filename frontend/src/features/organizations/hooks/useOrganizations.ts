import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi, type CreateOrgPayload, type UpdateOrgPayload } from '@/lib/api/organizations.api';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/store/auth.store';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list(),
  });
}

export function useCurrentOrg() {
  const orgId = useAuthStore((s) => s.user?.organization?.id);
  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => organizationsApi.getById(orgId as string),
    enabled: !!orgId,
  });
}

export function useSetOrgPlan() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ orgId, planId }: { orgId: string; planId: string | null }) =>
      organizationsApi.setPlan(orgId, planId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['organization', vars.orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      enqueueSnackbar('Plan updated.', { variant: 'success' });
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message ?? 'Failed to update plan.';
      enqueueSnackbar(Array.isArray(raw) ? raw.join(', ') : String(raw), { variant: 'error' });
    },
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['organization', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      useAuthStore.getState().refreshMe();
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message ?? 'Failed to update organization.';
      enqueueSnackbar(Array.isArray(raw) ? raw.join(', ') : String(raw), {
        variant: 'error',
      });
    },
  });
}

export function useUploadOrgLogo() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      organizationsApi.uploadLogo(id, file),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['organization', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      useAuthStore.getState().refreshMe();
      enqueueSnackbar('Logo updated.', { variant: 'success' });
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message ?? 'Failed to upload logo.';
      enqueueSnackbar(Array.isArray(raw) ? raw.join(', ') : String(raw), {
        variant: 'error',
      });
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
