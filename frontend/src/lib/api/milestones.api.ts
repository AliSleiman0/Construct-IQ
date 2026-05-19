import apiClient from './client';
import type {
  Milestone,
  CreateMilestonePayload,
  UpdateMilestonePayload,
} from '@/types/milestone.types';

type RawMilestone = Omit<Milestone, 'id'> & { id?: string; _id?: string };

function normalise(m: RawMilestone): Milestone {
  const { _id, id, ...rest } = m;
  return { ...rest, id: (id ?? _id) as string };
}

export const milestonesApi = {
  listByProject: async (projectId: string): Promise<Milestone[]> => {
    const res = await apiClient.get<RawMilestone[]>(`/projects/${projectId}/milestones`);
    return (res.data ?? []).map(normalise);
  },

  create: async (
    projectId: string,
    payload: CreateMilestonePayload,
  ): Promise<Milestone> => {
    const res = await apiClient.post<RawMilestone>(
      `/projects/${projectId}/milestones`,
      payload,
    );
    return normalise(res.data);
  },

  update: async (
    projectId: string,
    milestoneId: string,
    payload: UpdateMilestonePayload,
  ): Promise<Milestone> => {
    const res = await apiClient.patch<RawMilestone>(
      `/projects/${projectId}/milestones/${milestoneId}`,
      payload,
    );
    return normalise(res.data);
  },

  delete: async (projectId: string, milestoneId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/milestones/${milestoneId}`);
  },
};
