'use client';

import { Box } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function OrgAdminDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Organization Dashboard"
        subtitle="Roll-up across all your active projects."
      />

      <StatGrid>
        <StatCard label="Active Projects" value="6" hint="2 entering closeout" icon={FolderOpenIcon} tone="primary" />
        <StatCard label="Team Members" value="34" hint="3 invites pending" icon={PeopleIcon} tone="info" />
        <StatCard label="Budget Burn" value="68%" hint="On track for Q2" icon={AccountBalanceWalletIcon} tone="success" />
        <StatCard label="Open Issues" value="11" hint="2 high severity" icon={ReportProblemIcon} tone="warning" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Project status" subtitle="Distribution across portfolio">
          <MiniBarChart
            data={[
              { label: 'Plan', value: 1 },
              { label: 'Build', value: 4 },
              { label: 'Closeout', value: 1 },
              { label: 'Done', value: 8 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Reports filed (last 4 weeks)" subtitle="Daily reports across all sites">
          <MiniBarChart
            color="#16a34a"
            data={[
              { label: 'W1', value: 14 },
              { label: 'W2', value: 18 },
              { label: 'W3', value: 21 },
              { label: 'W4', value: 19 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
