'use client';

import { Box } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ArticleIcon from '@mui/icons-material/Article';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { usePmDashboard } from '@/features/dashboard/hooks/useOrgDashboard';

export default function PMDashboardPage() {
  const { data, isLoading, isError, refetch } = usePmDashboard();

  return (
    <Box>
      <PageHeader
        title="PM Dashboard"
        subtitle="Live snapshot of the projects you manage."
      />

      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <StatGrid>
            <StatCard
              label="My Projects"
              value={String(data.projectCount)}
              hint={`${data.activeProjectCount} active`}
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
              label="Issues to Triage"
              value={String(data.openIssueCount)}
              hint={`${data.escalatedIssueCount} escalated`}
              icon={ReportProblemIcon}
              tone="warning"
            />
            <StatCard
              label="Reports This Week"
              value={String(data.reportsThisWeek)}
              hint="Filed in the last 7 days"
              icon={ArticleIcon}
              tone="success"
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <DashboardPanel title="Task throughput" subtitle="Completed per day, last 7 days">
              <MiniBarChart data={data.taskThroughput} />
            </DashboardPanel>
            <DashboardPanel title="Open tasks by status" subtitle="Across your projects">
              <MiniBarChart color="#f59e0b" data={data.openTasksByStatus} />
            </DashboardPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
