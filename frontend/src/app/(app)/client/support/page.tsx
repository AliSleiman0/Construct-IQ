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

export default function ClientSupportPage() {
  const tickets = useMockState((s) => s.tickets);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const myTickets = useMemo(
    () => tickets.filter((t) => t.reporterId === user?.id),
    [tickets, user],
  );

  return (
    <Box>
      <PageHeader
        title="Support"
        subtitle="Reach out to ConstructIQ support — sales, contracts, or technical issues."
        actions={
          <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Contact support
          </AppButton>
        }
      />
      <TicketTable tickets={myTickets} detailBasePath="/client/support" hideOrgColumn />
      <NewTicketModal open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
