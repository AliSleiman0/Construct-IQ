'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useTickets } from '@/features/tickets/hooks/useTickets';

export default function SupportAgentTicketsPage() {
  // Support agents hold manage:tickets, so the backend returns the whole queue
  // (scoped to their org unless they are a super admin).
  const { data: tickets, isLoading, isError, refetch } = useTickets();

  return (
    <Box>
      <PageHeader
        title="Tickets"
        subtitle="Triage, assign, and resolve incoming customer issues."
      />
      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}
      {!isLoading && !isError && (
        <TicketTable tickets={tickets ?? []} detailBasePath="/support-agent/tickets" />
      )}
    </Box>
  );
}
