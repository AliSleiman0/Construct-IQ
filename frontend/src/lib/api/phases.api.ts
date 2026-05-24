import apiClient from './client';
import type { Phase, CreatePhasePayload, UpdatePhasePayload } from '@/types/phase.types';

type RawPhase = Omit<Phase, 'id'> & { id?: string; _id?: string };

function normalise(p: RawPhase): Phase {
  const { _id, id, ...rest } = p;
  return { ...rest, id: (id ?? _id) as string };
}

export const phasesApi = {
  listByProject: async (projectId: string): Promise<Phase[]> => {
    const res = await apiClient.get<RawPhase[]>(`/projects/${projectId}/phases`);
    return (res.data ?? []).map(normalise);
  },

  create: async (projectId: string, payload: CreatePhasePayload): Promise<Phase> => {
    const res = await apiClient.post<RawPhase>(`/projects/${projectId}/phases`, payload);
    return normalise(res.data);
  },

  update: async (
    projectId: string,
    phaseId: string,
    payload: UpdatePhasePayload,
  ): Promise<Phase> => {
    const res = await apiClient.patch<RawPhase>(
      `/projects/${projectId}/phases/${phaseId}`,
      payload,
    );
    return normalise(res.data);
  },

  delete: async (projectId: string, phaseId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/phases/${phaseId}`);
  },
};
