import axios from 'axios';

export interface PortalProjectData {
  project: {
    name: string;
    description: string | null;
    status: string;
    code: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
  };
  issues: {
    total: number;
    open: number;
    resolved: number;
  };
  team: Array<{ displayName: string; role: string | null }>;
}

const portalClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

portalClient.interceptors.response.use((response) => {
  if (response.data?.success !== undefined) {
    return { ...response, data: response.data.data };
  }
  return response;
});

export const portalApi = {
  getProjectData: async (token: string): Promise<PortalProjectData> => {
    const res = await portalClient.get(`/public/projects/${token}`);
    return res.data;
  },
};
