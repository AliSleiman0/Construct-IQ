'use client';

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations';
import { useTickets } from '@/features/tickets/hooks/useTickets';

export default function SupportAgentCustomersPage() {
  // Platform-staff view — the org list endpoint now admits Support Agents, not
  // just Super Admins. Open-ticket counts come from the tickets they can see.
  const { data: orgs, isLoading, isError, refetch } = useOrganizations();
  const { data: tickets } = useTickets();

  const openByOrg = new Map<string, number>();
  for (const t of (tickets ?? []) as any[]) {
    if (t.status !== 'CLOSED' && t.status !== 'RESOLVED') {
      const key = String(t.organizationId ?? t.orgId ?? '');
      openByOrg.set(key, (openByOrg.get(key) ?? 0) + 1);
    }
  }

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle="Read-only directory of every customer organization."
      />

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Customer</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Open tickets</TableCell>
              <TableCell>Joined</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(orgs ?? []).map((o) => {
              const openTickets = openByOrg.get(String(o.id)) ?? 0;
              return (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{o.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                    {o.slug}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={o.isActive ? 'Active' : 'Suspended'}
                      color={o.isActive ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{o._count?.users ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={openTickets}
                      size="small"
                      color={openTickets > 5 ? 'warning' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(o.createdAt).format('MMM YYYY')}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
