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
import { mockOrgs } from '@/mocks/orgs.mock';
import { useMockState } from '@/store/mock-state.store';

export default function SupportAgentCustomersPage() {
  const tickets = useMockState((s) => s.tickets);

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
            {mockOrgs.map((o) => {
              const openTickets = tickets.filter(
                (t) => t.orgId === o.id && t.status !== 'CLOSED' && t.status !== 'RESOLVED',
              ).length;
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
                  <TableCell>{o.userCount}</TableCell>
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
