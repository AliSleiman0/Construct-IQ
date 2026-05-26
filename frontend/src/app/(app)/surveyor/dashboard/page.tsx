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
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useSurveyorDashboard } from '@/features/dashboard/hooks/useOrgDashboard';

function money(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// Signed money for variation impact (additions vs deductions). Uses a unicode
// minus and an explicit + so the direction reads clearly in a one-line hint.
function signedMoney(value: number): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${money(Math.abs(value))}`;
}

export default function SurveyorDashboardPage() {
  const { data, isLoading, isError, refetch } = useSurveyorDashboard();

  return (
    <Box>
      <PageHeader
        title="QS Dashboard"
        subtitle="Bills of Quantities, variations, and valuations across your projects."
      />

      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <StatGrid>
            <StatCard
              label="BOQ Value"
              value={money(data.boqTotalValue)}
              hint={`${data.boqItemCount} items · ${data.boqLockedCount} locked`}
              icon={ListAltIcon}
              tone="primary"
            />
            <StatCard
              label="Pending Variations"
              value={String(data.pendingVariationCount)}
              hint={`${signedMoney(data.pendingVariationImpact)} impact`}
              icon={SwapHorizIcon}
              tone="warning"
            />
            <StatCard
              label="Awaiting Certification"
              value={String(data.awaitingCertificationCount)}
              hint={`${money(data.awaitingCertificationValue)} to certify`}
              icon={CalculateIcon}
              tone="info"
            />
            <StatCard
              label="Budget Variance"
              value={`${data.budgetVariancePct.toFixed(1)}%`}
              hint={`${money(data.committedCost)} committed of ${money(data.budgetPlannedTotal)}`}
              icon={AccountBalanceWalletIcon}
              tone={data.budgetVariancePct >= 0 ? 'success' : 'error'}
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <DashboardPanel title="Variations by status" subtitle="Count across your projects">
              <MiniBarChart data={data.variationsByStatus} />
            </DashboardPanel>
            <DashboardPanel title="Valuation value by status" subtitle="Total claimed (USD)">
              <MiniBarChart color="#7c3aed" data={data.valuationValueByStatus} />
            </DashboardPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
