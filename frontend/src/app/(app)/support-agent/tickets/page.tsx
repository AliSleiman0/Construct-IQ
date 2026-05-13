'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { useMockState } from '@/store/mock-state.store';

export default function SupportAgentTicketsPage() {
  const tickets = useMockState((s) => s.tickets);

  return (
    <Box>
      <PageHeader
        title="Tickets"
        subtitle="Triage, assign, and resolve incoming customer issues."
      />
      <TicketTable tickets={tickets} detailBasePath="/support-agent/tickets" />
    </Box>
  );
}
