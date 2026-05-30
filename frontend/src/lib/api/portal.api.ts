import axios from 'axios';

export interface PortalTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  progress: number;
}

export interface PortalIssue {
  id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
}

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
    items: PortalTask[];
  };
  issues: {
    total: number;
    open: number;
    resolved: number;
    bySeverity: Record<string, number>;
    items: PortalIssue[];
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
