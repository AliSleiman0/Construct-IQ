'use client';

import { Box } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function SupportAgentDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Support Queue"
        subtitle="Tickets across all customer organizations."
      />

      <StatGrid>
        <StatCard label="Open Queue" value="27" hint="Across 9 customers" icon={ConfirmationNumberIcon} tone="primary" />
        <StatCard label="My Assigned" value="6" hint="2 awaiting reply" icon={HourglassEmptyIcon} tone="info" />
        <StatCard label="SLA Breaches" value="4" hint="Needs attention" icon={WarningAmberIcon} tone="error" />
        <StatCard label="Resolved Today" value="9" hint="Avg 38m response" icon={CheckCircleOutlineIcon} tone="success" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Ticket volume — last 7 days">
          <MiniBarChart
            data={[
              { label: 'Mo', value: 14 },
              { label: 'Tu', value: 17 },
              { label: 'We', value: 11 },
              { label: 'Th', value: 19 },
              { label: 'Fr', value: 22 },
              { label: 'Sa', value: 6 },
              { label: 'Su', value: 4 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Open by priority">
          <MiniBarChart
            color="#dc2626"
            data={[
              { label: 'Low', value: 9 },
              { label: 'Norm', value: 11 },
              { label: 'High', value: 5 },
              { label: 'Urg', value: 2 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
