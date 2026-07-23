'use client';

import { Box } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useOrgDashboard } from '@/features/dashboard/hooks/useOrgDashboard';

function money(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Finance Viewer dashboard — org-wide, read-only.
 *
 * Reuses `GET /dashboard/org` (gated on `read:dashboard`, which
 * FINANCE_VIEWER carries). Unlike the PM/planner dashboards this one is
 * deliberately *not* member-scoped: finance needs the whole book, and the
 * role holds no write permission anywhere to act on it.
 */
export default function FinanceDashboardPage() {
  const { data, isLoading, isError, refetch } = useOrgDashboard();

  return (
    <Box>
      <PageHeader
        title="Finance Dashboard"
        subtitle="Budget, burn, and commitments across every project in the company."
      />

      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <StatGrid>
            <StatCard
              label="Total Budget"
              value={money(data.budgetTotal)}
              hint={`Across ${data.totalProjectCount} projects`}
              icon={AccountBalanceWalletIcon}
              tone="primary"
            />
            <StatCard
              label="Spent to Date"
              value={money(data.budgetSpent)}
              hint={`${data.budgetBurnPct}% of budget`}
              icon={TrendingUpIcon}
              tone={data.budgetBurnPct >= 90 ? 'error' : data.budgetBurnPct >= 75 ? 'warning' : 'success'}
            />
            <StatCard
              label="Remaining"
              value={money(Math.max(0, data.budgetTotal - data.budgetSpent))}
              hint="Uncommitted budget"
              icon={AccountBalanceWalletIcon}
              tone="info"
            />
            <StatCard
              label="Active Projects"
              value={String(data.activeProjectCount)}
              hint={`${data.openIssueCount} open issues`}
              icon={FolderOpenIcon}
              tone="default"
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <DashboardPanel title="Projects by status" subtitle="Where the portfolio stands">
              <MiniBarChart
                data={[
                  { label: 'Planning', value: data.projectStatusDistribution.planning },
                  { label: 'Active', value: data.projectStatusDistribution.active },
                  { label: 'On Hold', value: data.projectStatusDistribution.onHold },
                  { label: 'Done', value: data.projectStatusDistribution.completed },
                ]}
              />
            </DashboardPanel>
            <DashboardPanel title="Open issues by severity" subtitle="Cost-risk signal">
              <MiniBarChart
                data={[
                  { label: 'Critical', value: data.openIssuesByPriority.critical },
                  { label: 'High', value: data.openIssuesByPriority.high },
                  { label: 'Medium', value: data.openIssuesByPriority.medium },
                  { label: 'Low', value: data.openIssuesByPriority.low },
                ]}
              />
            </DashboardPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
