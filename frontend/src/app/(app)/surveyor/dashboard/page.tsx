'use client';

import { Box } from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CalculateIcon from '@mui/icons-material/Calculate';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function SurveyorDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="QS Dashboard"
        subtitle="Bills of Quantities, variations, and valuations across active projects."
      />

      <StatGrid>
        <StatCard label="BOQ Items" value="412" hint="Across 3 projects" icon={ListAltIcon} tone="primary" />
        <StatCard label="Pending Variations" value="6" hint="$24.8k impact" icon={SwapHorizIcon} tone="warning" />
        <StatCard label="Valuations Due" value="2" hint="May 5 cutoff" icon={CalculateIcon} tone="info" />
        <StatCard label="Budget Variance" value="-2.4%" hint="Within tolerance" icon={AccountBalanceWalletIcon} tone="success" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Variation impact by trade">
          <MiniBarChart
            data={[
              { label: 'Civil', value: 8 },
              { label: 'Struct', value: 11 },
              { label: 'MEP', value: 4 },
              { label: 'Arch', value: 1 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Cumulative valuations (k$)">
          <MiniBarChart
            color="#7c3aed"
            data={[
              { label: 'Jan', value: 80 },
              { label: 'Feb', value: 95 },
              { label: 'Mar', value: 110 },
              { label: 'Apr', value: 138 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
