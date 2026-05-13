'use client';

import { Box } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function SuperAdminDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="System Dashboard"
        subtitle="Cross-tenant overview of every organization on ConstructIQ."
      />

      <StatGrid>
        <StatCard label="Organizations" value="14" hint="3 added this quarter" icon={BusinessIcon} tone="primary" />
        <StatCard label="Active Users" value="312" hint="+18 vs last month" icon={GroupsIcon} tone="info" />
        <StatCard label="MRR" value="$48.2k" hint="+6.4% MoM" icon={AttachMoneyIcon} tone="success" />
        <StatCard label="Open Tickets" value="27" hint="4 SLA-breaching" icon={ConfirmationNumberIcon} tone="warning" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        <DashboardPanel title="MRR — last 8 weeks" subtitle="Recurring revenue across all tenants">
          <MiniBarChart
            data={[
              { label: 'W1', value: 38 },
              { label: 'W2', value: 41 },
              { label: 'W3', value: 39 },
              { label: 'W4', value: 43 },
              { label: 'W5', value: 44 },
              { label: 'W6', value: 45 },
              { label: 'W7', value: 47 },
              { label: 'W8', value: 48 },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel title="Top tickets by org" subtitle="Open count this week">
          <MiniBarChart
            color="#9333ea"
            data={[
              { label: 'A', value: 12 },
              { label: 'B', value: 7 },
              { label: 'C', value: 5 },
              { label: 'D', value: 3 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
