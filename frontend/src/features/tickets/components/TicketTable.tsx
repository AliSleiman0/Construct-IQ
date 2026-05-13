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
  TextField,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { MockTicket, TicketPriority, TicketStatus } from '@/mocks/tickets.mock';
import { TicketStatusBadge, TicketPriorityBadge } from './TicketStatusBadge';

interface TicketTableProps {
  tickets: MockTicket[];
  /** Where ticket detail links should point — e.g. "/super-admin/tickets" */
  detailBasePath: string;
  /** Hide the org column when scoping to a single org */
  hideOrgColumn?: boolean;
}

const STATUS_FILTER: ('ALL' | TicketStatus)[] = [
  'ALL',
  'OPEN',
  'IN_PROGRESS',
  'PENDING',
  'RESOLVED',
  'CLOSED',
];
const PRIORITY_FILTER: ('ALL' | TicketPriority)[] = ['ALL', 'LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function TicketTable({ tickets, detailBasePath, hideOrgColumn }: TicketTableProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | TicketStatus>('ALL');
  const [priority, setPriority] = useState<'ALL' | TicketPriority>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (status !== 'ALL' && t.status !== status) return false;
      if (priority !== 'ALL' && t.priority !== priority) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        t.orgName.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, status, priority]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
        <TextField
          size="small"
          placeholder="Search by ID, title, reporter, org…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'ALL' | TicketStatus)}
          sx={{ minWidth: 150 }}
        >
          {STATUS_FILTER.map((s) => (
            <MenuItem key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.replace('_', ' ').toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'ALL' | TicketPriority)}
          sx={{ minWidth: 150 }}
        >
          {PRIORITY_FILTER.map((p) => (
            <MenuItem key={p} value={p}>
              {p === 'ALL' ? 'All priorities' : p.toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              {!hideOrgColumn && <TableCell>Org</TableCell>}
              <TableCell>Reporter</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={hideOrgColumn ? 7 : 8}>
                  <Box textAlign="center" py={5}>
                    <Typography variant="body2" color="text.secondary">
                      No tickets match the current filters.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow
                key={t.id}
                hover
                sx={{ cursor: 'pointer', '& a': { color: 'inherit', textDecoration: 'none' } }}
              >
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                  <Link href={`${detailBasePath}/${t.id}`}>{t.id}</Link>
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>
                  <Link href={`${detailBasePath}/${t.id}`}>{t.title}</Link>
                </TableCell>
                <TableCell>
                  <TicketStatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <TicketPriorityBadge priority={t.priority} />
                </TableCell>
                {!hideOrgColumn && <TableCell>{t.orgName}</TableCell>}
                <TableCell>{t.reporterName}</TableCell>
                <TableCell>
                  {t.assigneeName ?? <Typography variant="caption" color="text.secondary">Unassigned</Typography>}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(t.updatedAt).format('MMM D, HH:mm')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
