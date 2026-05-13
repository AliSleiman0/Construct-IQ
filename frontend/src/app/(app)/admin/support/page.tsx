'use client';

import { useMemo, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { AppButton } from '@/components/ui/AppButton';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { NewTicketModal } from '@/features/tickets/components/NewTicketModal';
import { useTickets } from '@/features/tickets/hooks/useTickets';
import type { MockTicket } from '@/mocks/tickets.mock';

export default function OrgAdminSupportPage() {
  const { data: rawTickets = [], isLoading } = useTickets();
  const [open, setOpen] = useState(false);

  // Map API ticket shape to MockTicket shape for TicketTable
  const tickets: MockTicket[] = useMemo(
    () =>
      rawTickets.map((t: any) => ({
        id: t._id ?? t.id,
        title: t.title,
        body: t.body ?? '',
        status: t.status,
        priority: t.priority,
        orgId: t.organizationId ?? '',
        orgName: '',
        reporterId: t.reporterId ?? '',
        reporterName: t.reporterName ?? t.reporterId ?? 'Unknown',
        assigneeId: t.assigneeId ?? null,
        assigneeName: t.assigneeName ?? t.assigneeId ?? null,
        createdAt: t.createdAt ?? '',
        updatedAt: t.updatedAt ?? t.createdAt ?? '',
      })),
    [rawTickets],
  );

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === 'OPEN').length,
    [tickets],
  );
  const inProgressCount = useMemo(
    () => tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    [tickets],
  );
  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === 'RESOLVED').length,
    [tickets],
  );

  return (
    <Box>
      <PageHeader
        title="Support"
        subtitle="File and track support tickets. Our team responds within 24 hours on the Professional plan."
        actions={
          <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New ticket
          </AppButton>
        }
      />

      {isLoading ? (
        <StatGrid>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard label="Total tickets" value={String(tickets.length)} icon={ConfirmationNumberIcon} tone="info" />
          <StatCard label="Open" value={String(openCount)} icon={MarkEmailUnreadIcon} tone="primary" />
          <StatCard label="In progress" value={String(inProgressCount)} icon={HourglassBottomIcon} tone="warning" />
          <StatCard label="Resolved" value={String(resolvedCount)} icon={CheckCircleIcon} tone="success" />
        </StatGrid>
      )}

      <TicketTable tickets={tickets} detailBasePath="/admin/support" hideOrgColumn />
      <NewTicketModal open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
