'use client';

import { Box, Stack } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArticleIcon from '@mui/icons-material/Article';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { projectsForOrg } from '@/mocks/projects.mock';
import { useAuthStore } from '@/store/auth.store';

export default function AdminReportsPage() {
  const user = useAuthStore((s) => s.user);
  const projects = user ? projectsForOrg(user.organization.id) : [];

  const totalBudget = projects.reduce((s, p) => s + p.budgetUsd, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spentUsd, 0);
  const burnPct = totalBudget === 0 ? 0 : Math.round((totalSpent / totalBudget) * 100);

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Cross-project roll-up across your portfolio." />

      <StatGrid>
        <StatCard label="Active projects" value={String(projects.length)} icon={FolderOpenIcon} tone="primary" />
        <StatCard
          label="Budget burn"
          value={`${burnPct}%`}
          hint={`$${(totalSpent / 1_000_000).toFixed(1)}M of $${(totalBudget / 1_000_000).toFixed(1)}M`}
          icon={AccountBalanceWalletIcon}
          tone={burnPct > 90 ? 'warning' : 'success'}
        />
        <StatCard label="Reports filed (30d)" value="78" icon={ArticleIcon} tone="info" />
        <StatCard label="Issues open" value="11" hint="2 high severity" icon={ReportProblemIcon} tone="warning" />
      </StatGrid>

      <Stack gap={2.5}>
        <DashboardPanel title="Project status breakdown">
          <MiniBarChart
            data={[
              { label: 'Planning', value: projects.filter((p) => p.status === 'PLANNING').length },
              { label: 'Active', value: projects.filter((p) => p.status === 'IN_PROGRESS').length },
              { label: 'Closeout', value: projects.filter((p) => p.status === 'CLOSEOUT').length },
              { label: 'Done', value: projects.filter((p) => p.status === 'COMPLETED').length },
              { label: 'Hold', value: projects.filter((p) => p.status === 'ON_HOLD').length },
            ]}
          />
        </DashboardPanel>
        <ProjectsTable projects={projects} detailBasePath="/admin/projects" hideOrgColumn />
      </Stack>
    </Box>
  );
}
