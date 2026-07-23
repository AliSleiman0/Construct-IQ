export interface DashboardStats {
  projectCount: number;
  activeProjects: number;
  taskCount: number;
  openIssues: number;
  teamCount: number;
}

export interface PmDashboardData {
  projectCount: number;
  activeProjectCount: number;
  openTaskCount: number;
  tasksDueThisWeek: number;
  openIssueCount: number;
  escalatedIssueCount: number;
  reportsThisWeek: number;
  taskThroughput: { label: string; value: number }[];
  openTasksByStatus: { label: string; value: number }[];
}

export interface SiteEngDashboardData {
  projectCount: number;
  myOpenTaskCount: number;
  myTasksDueThisWeek: number;
  openIssueCount: number;
  escalatedIssueCount: number;
  myReportsThisWeek: number;
  taskThroughput: { label: string; value: number }[];
  myOpenTasksByStatus: { label: string; value: number }[];
}

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

/** Quantity-Surveyor cost rollup (GET /dashboard/surveyor). */
export interface SurveyorDashboardData {
  projectCount: number;
  boqItemCount: number;
  boqTotalValue: number;
  boqLockedCount: number;
  pendingVariationCount: number;
  pendingVariationImpact: number;
  approvedVariationImpact: number;
  variationsByStatus: { label: string; value: number }[];
  awaitingCertificationCount: number;
  awaitingCertificationValue: number;
  certifiedValue: number;
  valuationValueByStatus: { label: string; value: number }[];
  budgetPlannedTotal: number;
  budgetActualSpend: number;
  committedCost: number;
  budgetVariancePct: number;
}

/**
 * Buyer-facing dashboard (`GET /dashboard/client`). Scoped to the unit the
 * caller owns rather than to project membership — a CLIENT belongs to no
 * project. `hasUnit: false` is a valid, non-error state for a buyer who has
 * not reserved yet.
 */
export interface ClientDashboardData {
  hasUnit: boolean;
  unitLabel: string | null;
  unitType?: string;
  bedrooms?: number | null;
  projectName: string | null;
  percentComplete: number;
  paidToDate: number;
  contractTotal: number;
  nextMilestoneName: string | null;
  nextMilestoneDate: string | null;
  nextPaymentAmount: number | null;
  nextPaymentDate: string | null;
  milestoneProgress: { label: string; value: number }[];
}
