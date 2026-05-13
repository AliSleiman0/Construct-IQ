'use client';

import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Typography, TextField, Stack, MenuItem, CircularProgress,
} from '@mui/material';
import { useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useTickets } from '@/features/tickets/hooks/useTickets';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'default',
};
const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default', MEDIUM: 'info', HIGH: 'warning', URGENT: 'error',
};

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function SuperAdminTicketsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');

  const { data: tickets = [], isLoading } = useTickets({
    status: status !== 'ALL' ? status : undefined,
    priority: priority !== 'ALL' ? priority : undefined,
  });

  const filtered = search.trim()
    ? (tickets as any[]).filter((t: any) => {
        const q = search.toLowerCase();
        return (
          (t._id ?? '').toLowerCase().includes(q) ||
          (t.title ?? '').toLowerCase().includes(q) ||
          (t.reporterId ?? '').toLowerCase().includes(q)
        );
      })
    : (tickets as any[]);

  return (
    <Box>
      <PageHeader
        title="Tickets"
        subtitle="Cross-tenant ticket queue. Reassign and resolve as needed."
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2.5}>
        <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" placeholder="ID, title, reporter…" sx={{ flex: 1 }} />
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}
          size="small" sx={{ minWidth: 140 }}>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}
          size="small" sx={{ minWidth: 140 }}>
          {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Reporter</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t: any) => (
                  <TableRow key={t._id} hover
                    component={Link} href={`/super-admin/tickets/${t._id}`}
                    sx={{ textDecoration: 'none', cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 500, maxWidth: 300 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{t.title}</Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        #{t._id?.slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={t.status} color={STATUS_COLOR[t.status] ?? 'default'}
                        size="small" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={t.priority} color={PRIORITY_COLOR[t.priority] ?? 'default'}
                        size="small" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{t.reporterId ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {t.assigneeId ?? 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(t.createdAt).format('DD MMM YYYY')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
