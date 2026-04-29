'use client';

import { Box } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StoreIcon from '@mui/icons-material/Store';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function ProcurementDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Material flow across active job sites."
      />

      <StatGrid>
        <StatCard label="Open Requests" value="12" hint="3 awaiting quote" icon={AssignmentIcon} tone="primary" />
        <StatCard label="Active POs" value="18" hint="$284k committed" icon={ShoppingCartIcon} tone="info" />
        <StatCard label="In Transit" value="4" hint="2 delivering today" icon={LocalShippingIcon} tone="warning" />
        <StatCard label="Suppliers" value="22" hint="2 onboarding" icon={StoreIcon} tone="success" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Spend by category">
          <MiniBarChart
            data={[
              { label: 'Steel', value: 92 },
              { label: 'Conc.', value: 68 },
              { label: 'MEP', value: 41 },
              { label: 'Finish', value: 18 },
              { label: 'Other', value: 12 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Deliveries this week">
          <MiniBarChart
            color="#0ea5e9"
            data={[
              { label: 'Mo', value: 2 },
              { label: 'Tu', value: 4 },
              { label: 'We', value: 3 },
              { label: 'Th', value: 5 },
              { label: 'Fr', value: 1 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
