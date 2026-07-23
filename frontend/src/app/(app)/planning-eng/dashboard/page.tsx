'use client';

import { Box } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { usePmDashboard } from '@/features/dashboard/hooks/useOrgDashboard';

/**
 * Planning Engineer dashboard.
 *
 * Reuses `GET /dashboard/pm` — it is member-scoped rather than role-scoped
 * (it filters projects by `members.userId`) and gated only on `read:dashboard`,
 * which PLANNING_ENG carries. Its task/schedule framing is what a planner
 * needs; no separate endpoint is warranted.
 */
export default function PlanningEngDashboardPage() {
  const { data, isLoading, isError, refetch } = usePmDashboard();

  return (
    <Box>
      <PageHeader
        title="Planning Dashboard"
        subtitle="Schedule health, task flow, and milestones across your projects."
      />

      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <StatGrid>
            <StatCard
              label="Active Projects"
              value={String(data.activeProjectCount)}
              hint={`${data.projectCount} total assigned`}
              icon={FolderOpenIcon}
              tone="primary"
            />
            <StatCard
              label="Open Tasks"
              value={String(data.openTaskCount)}
              hint={`${data.tasksDueThisWeek} due this week`}
              icon={TaskAltIcon}
              tone="info"
            />
            <StatCard
              label="Due This Week"
              value={String(data.tasksDueThisWeek)}
              hint="Across all assigned projects"
              icon={CalendarMonthIcon}
              tone={data.tasksDueThisWeek > 0 ? 'warning' : 'success'}
            />
            <StatCard
              label="Open Issues"
              value={String(data.openIssueCount)}
              hint={`${data.escalatedIssueCount} escalated`}
              icon={ReportProblemIcon}
              tone={data.escalatedIssueCount > 0 ? 'error' : 'default'}
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <DashboardPanel title="Open tasks by status" subtitle="Where the schedule is sitting right now">
              <MiniBarChart data={data.openTasksByStatus} />
            </DashboardPanel>
            <DashboardPanel title="Task throughput" subtitle="Tasks completed per day, last 7 days">
              <MiniBarChart data={data.taskThroughput} />
            </DashboardPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
