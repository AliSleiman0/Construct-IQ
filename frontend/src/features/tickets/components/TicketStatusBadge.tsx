'use client';

import { Chip } from '@mui/material';
import type { TicketPriority, TicketStatus } from '@/mocks/tickets.mock';

const STATUS_COLOR: Record<TicketStatus, 'default' | 'primary' | 'info' | 'warning' | 'success'> = {
  OPEN: 'primary',
  IN_PROGRESS: 'info',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const PRIORITY_COLOR: Record<TicketPriority, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  LOW: 'default',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Chip
      label={STATUS_LABEL[status]}
      color={STATUS_COLOR[status]}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, textTransform: 'capitalize' }}
    />
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Chip
      label={PRIORITY_LABEL[priority]}
      color={PRIORITY_COLOR[priority]}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
}
