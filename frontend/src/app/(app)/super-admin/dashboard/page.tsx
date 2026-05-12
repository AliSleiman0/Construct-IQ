'use client';

import { Box, CircularProgress } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations';
import { useTickets } from '@/features/tickets/hooks/useTickets';
import { useInvoices } from '@/features/billing/hooks/useInvoices';
import { usersApi } from '@/lib/api/users.api';

export default function SuperAdminDashboardPage() {
  const { data: orgs = [], isLoading: orgsLoading } = useOrganizations();
  const { data: openTickets = [], isLoading: ticketsLoading } = useTickets({ status: 'OPEN' });
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const isLoading = orgsLoading || ticketsLoading || invoicesLoading || usersLoading;

  const totalInvoiced = (invoices as any[])
    .reduce((sum: number, inv: any) => sum + (inv.amountUsd ?? 0), 0);
  const totalFormatted = totalInvoiced >= 1000
    ? `$${(totalInvoiced / 1000).toFixed(1)}k`
    : `$${totalInvoiced.toFixed(0)}`;

  // group open tickets by org for chart
  const ticketsByOrg = (openTickets as any[]).reduce<Record<string, number>>((acc, t) => {
    const key = t.organizationId ?? 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const orgMap = Object.fromEntries(
    (orgs as any[]).map((o: any) => [o._id, o.name ?? o.slug]),
  );

  const topOrgChart = Object.entries(ticketsByOrg)
    .map(([orgId, count]) => ({ label: (orgMap[orgId] ?? orgId).substring(0, 8), value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const invoiceStatusChart = ['PAID', 'ISSUED', 'OVERDUE', 'VOID', 'DRAFT'].map((status) => ({
    label: status,
    value: (invoices as any[])
      .filter((inv: any) => inv.status === status)
      .reduce((sum: number, inv: any) => sum + (inv.amountUsd ?? 0), 0),
  }));

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="System Dashboard"
        subtitle="Cross-tenant overview of every organization on ConstructIQ."
      />

      <StatGrid>
        <StatCard
          label="Organizations"
          value={String((orgs as any[]).length)}
          hint={`${(orgs as any[]).filter((o: any) => o.isActive).length} active`}
          icon={BusinessIcon}
          tone="primary"
        />
        <StatCard
          label="Users"
          value={String((users as any[]).length)}
          hint="Across all tenants"
          icon={GroupsIcon}
          tone="info"
        />
        <StatCard
          label="Total Invoiced"
          value={totalFormatted}
          hint={`${(invoices as any[]).length} invoice(s)`}
          icon={AttachMoneyIcon}
          tone="success"
        />
        <StatCard
          label="Open Tickets"
          value={String((openTickets as any[]).length)}
          hint={(openTickets as any[]).length > 0 ? 'Needs attention' : 'All resolved'}
          icon={ConfirmationNumberIcon}
          tone="warning"
        />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        <DashboardPanel title="Invoices by status" subtitle="Total value per status across all tenants">
          <MiniBarChart data={invoiceStatusChart} />
        </DashboardPanel>

        <DashboardPanel
          title="Open tickets by org"
          subtitle={topOrgChart.length ? 'Current open count' : 'No open tickets'}
        >
          {topOrgChart.length > 0 ? (
            <MiniBarChart color="#9333ea" data={topOrgChart} />
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" height={120}
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
              No open tickets 🎉
            </Box>
          )}
        </DashboardPanel>
      </Box>
    </Box>
  );
}
