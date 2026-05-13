'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { useMockState } from '@/store/mock-state.store';

export default function SuperAdminTicketsPage() {
  const tickets = useMockState((s) => s.tickets);

  return (
    <Box>
      <PageHeader
        title="Tickets"
        subtitle="Cross-tenant ticket queue. Reassign and resolve as needed."
      />
      <TicketTable tickets={tickets} detailBasePath="/super-admin/tickets" />
    </Box>
  );
}
