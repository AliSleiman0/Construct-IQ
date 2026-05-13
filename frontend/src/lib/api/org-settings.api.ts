import apiClient from './client';
import type { OrgSettings, UpdateOrgSettingsPayload } from '@/types/settings.types';

export const orgSettingsApi = {
  get: async (): Promise<OrgSettings> => {
    const res = await apiClient.get<OrgSettings>('/org-settings');
    return res.data;
  },

  update: async (payload: UpdateOrgSettingsPayload): Promise<OrgSettings> => {
    const res = await apiClient.patch<OrgSettings>('/org-settings', payload);
    return res.data;
  },
};
