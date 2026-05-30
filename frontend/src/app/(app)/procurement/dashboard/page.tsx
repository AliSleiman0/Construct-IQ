'use client';

import { Box, Skeleton } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StoreIcon from '@mui/icons-material/Store';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { useProcurementDashboard } from '@/features/procurement/hooks/useProcurementDashboard';

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toLocaleString()}`;
}

export default function ProcurementDashboardPage() {
  const { data, isLoading } = useProcurementDashboard();

  return (
    <Box>
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Material flow across active job sites."
      />

      <StatGrid>
        <StatCard
          label="Open Requests"
          value={isLoading ? '…' : String(data?.materialRequests.pending ?? 0)}
          hint={`${data?.materialRequests.approved ?? 0} approved`}
          icon={AssignmentIcon}
          tone="primary"
        />
        <StatCard
          label="Active POs"
          value={isLoading ? '…' : String(data?.activePOs ?? 0)}
          hint={data ? `${money(data.monthlySpend)} this month` : ''}
          icon={ShoppingCartIcon}
          tone="info"
        />
        <StatCard
          label="Pending Deliveries"
          value={isLoading ? '…' : String(data?.pendingDeliveries ?? 0)}
          hint=""
          icon={LocalShippingIcon}
          tone="warning"
        />
        <StatCard
          label="Active Suppliers"
          value={isLoading ? '…' : String(data?.activeSuppliers ?? 0)}
          hint=""
          icon={StoreIcon}
          tone="success"
        />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Spend by category">
          {isLoading ? (
            <Skeleton variant="rounded" height={160} />
          ) : (
            <MiniBarChart
              data={
                data?.spendByCategory.length
                  ? data.spendByCategory.map((d) => ({ label: d.label.slice(0, 6), value: d.value }))
                  : [{ label: 'No data', value: 0 }]
              }
            />
          )}
        </DashboardPanel>
        <DashboardPanel title="Deliveries this week">
          {isLoading ? (
            <Skeleton variant="rounded" height={160} />
          ) : (
            <MiniBarChart
              color="#0ea5e9"
              data={data?.deliveriesThisWeek ?? [{ label: 'No data', value: 0 }]}
            />
          )}
        </DashboardPanel>
      </Box>
    </Box>
  );
}
