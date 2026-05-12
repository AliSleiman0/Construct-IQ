'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Typography, Box,
} from '@mui/material';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { SupportTicket } from '@/types/ticket.types';

dayjs.extend(relativeTime);

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  PENDING: 'default',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const PRIORITY_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'error',
};

interface TicketTableProps {
  tickets: SupportTicket[];
  detailBasePath: string;
  hideOrgColumn?: boolean;
}

export function TicketTable({ tickets, detailBasePath }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <Typography color="text.secondary">No support tickets yet.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Subject</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created by</TableCell>
            <TableCell>Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }}>
              <TableCell>
                <Link
                  href={`${detailBasePath}/${ticket.id}`}
                  style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
                >
                  {ticket.subject}
                </Link>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {ticket.category.toLowerCase().replace('_', ' ')}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={ticket.priority}
                  size="small"
                  color={PRIORITY_COLORS[ticket.priority] ?? 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={ticket.status.replace('_', ' ')}
                  size="small"
                  color={STATUS_COLORS[ticket.status] ?? 'default'}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {ticket.createdBy.firstName} {ticket.createdBy.lastName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {dayjs(ticket.createdAt).fromNow()}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
