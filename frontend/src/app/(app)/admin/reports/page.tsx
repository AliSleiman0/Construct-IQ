'use client';

import { Box, Button, Skeleton } from '@mui/material';
import Link from 'next/link';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PaymentsIcon from '@mui/icons-material/Payments';
import DescriptionIcon from '@mui/icons-material/Description';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DateRangeIcon from '@mui/icons-material/DateRange';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useOrgDashboard } from '@/features/dashboard/hooks/useOrgDashboard';
import { useProjects } from '@/features/projects/hooks/useProjects';

function formatMillions(n: number): string {
  if (n === 0) return '$0';
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

export default function AdminReportsPage() {
  const { data: dashboard, isLoading: dashLoading } = useOrgDashboard();
  const { data: projects = [], isLoading: projLoading } = useProjects();

  const isLoading = dashLoading || projLoading;

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Cross-project analytics roll-up for your organization."
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" color="inherit" startIcon={<DateRangeIcon />}>
              Last 30 days
            </Button>
            <Button variant="outlined" color="inherit" startIcon={<DownloadIcon />}>
              Export
            </Button>
          </Box>
        }
      />

      {isLoading ? (
        <StatGrid>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </StatGrid>
      ) : dashboard ? (
        <>
          <StatGrid>
            <StatCard
              label="Active Projects"
              value={String(dashboard.activeProjectCount)}
              hint={`${dashboard.totalProjectCount} total \u00B7 ${dashboard.projectStatusDistribution.planning} in planning`}
              icon={FolderOpenIcon}
              tone="primary"
            />
            <StatCard
              label="Total Budget Burn"
              value={`${formatMillions(dashboard.budgetSpent)} / ${formatMillions(dashboard.budgetTotal)}`}
              hint={`${dashboard.budgetBurnPct}% of allocated budget`}
              icon={PaymentsIcon}
              tone="warning"
            />
            <StatCard
              label="Reports Filed (30d)"
              value={String(dashboard.reportsFiledLast30d)}
              hint={`Across ${dashboard.activeProjectCount} active projects`}
              icon={DescriptionIcon}
              tone="info"
            />
            <StatCard
              label="Open Issues"
              value={String(dashboard.openIssueCount)}
              hint={`${dashboard.openIssuesByPriority.high} high \u00B7 ${dashboard.openIssuesByPriority.medium} medium`}
              icon={ReportProblemIcon}
              tone="error"
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mb: 2.5 }}>
            <DashboardPanel title="Project Status Breakdown" subtitle="Across the organization">
              <MiniBarChart
                data={[
                  { label: 'Planning', value: dashboard.projectStatusDistribution.planning },
                  { label: 'Active', value: dashboard.projectStatusDistribution.active },
                  { label: 'On Hold', value: dashboard.projectStatusDistribution.onHold },
                  { label: 'Completed', value: dashboard.projectStatusDistribution.completed },
                  { label: 'Cancelled', value: dashboard.projectStatusDistribution.cancelled },
                ]}
              />
            </DashboardPanel>
            <DashboardPanel title="Issues by Severity" subtitle="Open issues, last 30 days">
              <MiniBarChart
                data={[
                  { label: 'Critical', value: dashboard.openIssuesByPriority.critical },
                  { label: 'High', value: dashboard.openIssuesByPriority.high },
                  { label: 'Medium', value: dashboard.openIssuesByPriority.medium },
                  { label: 'Low', value: dashboard.openIssuesByPriority.low },
                ]}
              />
            </DashboardPanel>
          </Box>
        </>
      ) : null}

      <DashboardPanel
        title="Projects Overview"
        subtitle="All projects \u2014 org-scoped view"
        action={
          <Button
            component={Link}
            href="/admin/projects"
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon />}
          >
            Go to Projects
          </Button>
        }
      >
        <ProjectsTable projects={projects} detailBasePath="/admin/projects" />
      </DashboardPanel>
    </Box>
  );
}
