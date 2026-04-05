import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { organizationsApi, CreateOrgPayload } from '@/lib/api/organizations.api';

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: CreateOrgPayload) => organizationsApi.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      enqueueSnackbar(`Company "${data.org.name}" created successfully`, { variant: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Failed to create company';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });
}

export function useSetCompanyActive() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      organizationsApi.setActive(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      enqueueSnackbar(
        `Company "${data.name}" has been ${data.isActive ? 'activated' : 'suspended'}`,
        { variant: data.isActive ? 'success' : 'warning' },
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Failed to update company status';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });
}
