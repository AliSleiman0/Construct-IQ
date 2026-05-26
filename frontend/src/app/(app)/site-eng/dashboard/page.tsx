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
import { useSiteEngDashboard } from '@/features/dashboard/hooks/useOrgDashboard';

export default function SiteEngDashboardPage() {
  const { data, isLoading, isError, refetch } = useSiteEngDashboard();

  return (
    <Box>
      <PageHeader
        title="Site Dashboard"
        subtitle="Your work across your assigned projects."
      />

      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <StatGrid>
            <StatCard
              label="My Projects"
              value={String(data.projectCount)}
              hint="Assigned to you"
              icon={FolderOpenIcon}
              tone="primary"
            />
            <StatCard
              label="My Open Tasks"
              value={String(data.myOpenTaskCount)}
              hint={`${data.myTasksDueThisWeek} due this week`}
              icon={TaskAltIcon}
              tone="info"
            />
            <StatCard
              label="Open Issues"
              value={String(data.openIssueCount)}
              hint={`${data.escalatedIssueCount} high/critical`}
              icon={ReportProblemIcon}
              tone="warning"
            />
            <StatCard
              label="My Reports"
              value={String(data.myReportsThisWeek)}
              hint="Filed in the last 7 days"
              icon={ArticleIcon}
              tone="success"
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <DashboardPanel title="My task throughput" subtitle="Completed per day, last 7 days">
              <MiniBarChart data={data.taskThroughput} />
            </DashboardPanel>
            <DashboardPanel title="My open tasks by status" subtitle="Across your projects">
              <MiniBarChart color="#f59e0b" data={data.myOpenTasksByStatus} />
            </DashboardPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
