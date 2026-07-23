'use client';

import { Box, Paper, Typography } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ConstructionIcon from '@mui/icons-material/Construction';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useClientDashboard } from '@/features/dashboard/hooks/useOrgDashboard';
import { useAuthStore } from '@/store/auth.store';

function money(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ClientDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useClientDashboard();

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  // Not an error state — a buyer who has not reserved a unit yet.
  if (!data?.hasUnit) {
    return (
      <Box>
        <PageHeader title={user ? `Welcome, ${user.firstName}` : 'Welcome'} />
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body1">
            You don&apos;t have a unit yet. Browse the building to find one.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const outstanding = Math.max(0, data.contractTotal - data.paidToDate);

  return (
    <Box>
      <PageHeader
        title={user ? `Welcome back, ${user.firstName}` : 'Welcome back'}
        subtitle={`Here's the latest on ${data.projectName ?? 'your project'} — Unit ${data.unitLabel}.`}
      />

      <StatGrid>
        <StatCard
          label="My Unit"
          value={data.unitLabel ?? '—'}
          hint={[data.projectName, data.bedrooms ? `${data.bedrooms} BR` : null]
            .filter(Boolean)
            .join(' · ')}
          icon={ApartmentIcon}
          tone="primary"
        />
        <StatCard
          label="Construction"
          value={`${data.percentComplete}%`}
          hint={data.nextMilestoneName ? `Building: ${data.nextMilestoneName}` : 'On schedule'}
          icon={ConstructionIcon}
          tone="info"
        />
        <StatCard
          label="Paid to Date"
          value={money(data.paidToDate)}
          hint={`of ${money(data.contractTotal)} contract`}
          icon={PaymentIcon}
          tone={outstanding === 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Next Payment"
          value={data.nextPaymentAmount != null ? money(data.nextPaymentAmount) : 'All paid'}
          hint={
            data.nextPaymentDate
              ? `Due ${dayjs(data.nextPaymentDate).format('MMM D, YYYY')}`
              : 'No installments outstanding'
          }
          icon={EventIcon}
          tone={data.nextPaymentAmount != null ? 'warning' : 'success'}
        />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Construction progress" subtitle="Milestone completion percentage">
          {data.milestoneProgress.length > 0 ? (
            <MiniBarChart data={data.milestoneProgress} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No milestones have been published yet.
            </Typography>
          )}
        </DashboardPanel>
        <DashboardPanel title="Payment summary" subtitle="Against your contract value">
          <MiniBarChart
            data={[
              { label: 'Paid', value: data.paidToDate },
              { label: 'Outstanding', value: outstanding },
            ]}
          />
          {data.nextMilestoneDate && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Next milestone target {dayjs(data.nextMilestoneDate).format('MMM D, YYYY')}
            </Typography>
          )}
        </DashboardPanel>
      </Box>
    </Box>
  );
}
