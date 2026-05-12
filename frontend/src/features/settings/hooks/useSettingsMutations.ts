import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orgSettingsApi } from '@/lib/api/org-settings.api';
import type { UpdateOrgSettingsPayload } from '@/types/settings.types';

export function useUpdateOrgSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateOrgSettingsPayload) => orgSettingsApi.update(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-settings'] }),
  });
}
