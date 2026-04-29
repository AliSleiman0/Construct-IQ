'use client';

import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { NewTicketModal } from '@/features/tickets/components/NewTicketModal';
import { useMockState } from '@/store/mock-state.store';
import { useAuthStore } from '@/store/auth.store';

export default function OrgAdminSupportPage() {
  const tickets = useMockState((s) => s.tickets);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const orgTickets = useMemo(
    () => tickets.filter((t) => t.orgId === user?.organization.id),
    [tickets, user],
  );

  return (
    <Box>
      <PageHeader
        title="Support"
        subtitle="Tickets your organization has filed with ConstructIQ support."
        actions={
          <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New ticket
          </AppButton>
        }
      />
      <TicketTable tickets={orgTickets} detailBasePath="/admin/support" hideOrgColumn />
      <NewTicketModal open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
