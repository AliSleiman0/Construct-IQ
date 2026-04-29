'use client';

import { Box } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ConstructionIcon from '@mui/icons-material/Construction';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function ClientDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Welcome back, Carlos"
        subtitle="Here's the latest on Tower Heights — Unit 12B."
      />

      <StatGrid>
        <StatCard label="My Unit" value="12B" hint="Tower Heights · 3 BR" icon={ApartmentIcon} tone="primary" />
        <StatCard label="Construction" value="62%" hint="On schedule" icon={ConstructionIcon} tone="info" />
        <StatCard label="Paid to Date" value="$185k" hint="of $410k contract" icon={PaymentIcon} tone="success" />
        <StatCard label="Next Milestone" value="Jul 12" hint="Envelope complete" icon={EventIcon} tone="warning" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Construction progress" subtitle="Phase completion percentage">
          <MiniBarChart
            data={[
              { label: 'Found.', value: 100 },
              { label: 'Struct.', value: 100 },
              { label: 'Envel.', value: 78 },
              { label: 'MEP', value: 32 },
              { label: 'Finish', value: 0 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Payment schedule" subtitle="Cumulative paid (k$) over 12 months">
          <MiniBarChart
            color="#16a34a"
            data={[
              { label: 'M1', value: 41 },
              { label: 'M2', value: 82 },
              { label: 'M3', value: 123 },
              { label: 'M4', value: 164 },
              { label: 'M5', value: 185 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
