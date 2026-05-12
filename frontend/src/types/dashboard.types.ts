export interface OrgDashboardData {
  activeProjectCount: number;
  totalProjectCount: number;
  teamMemberCount: number;
  budgetTotal: number;
  budgetSpent: number;
  budgetBurnPct: number;
  openIssueCount: number;
  openIssuesByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  projectStatusDistribution: {
    planning: number;
    active: number;
    onHold: number;
    completed: number;
    cancelled: number;
  };
  weeklyReportCounts: { week: string; count: number }[];
  reportsFiledLast30d: number;
  recentActivity: {
    id: string;
    userName: string;
    avatarColor: string;
    action: string;
    projectCode: string | null;
    projectId: string | null;
    detail: string;
    createdAt: string;
  }[];
}
