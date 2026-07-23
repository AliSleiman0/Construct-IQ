'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { NewTicketModal } from '@/features/tickets/components/NewTicketModal';
import { useTickets } from '@/features/tickets/hooks/useTickets';

export default function ClientSupportPage() {
  const { data: tickets, isLoading, isError, refetch } = useTickets();
  const [open, setOpen] = useState(false);

  // No client-side reporter filter: GET /tickets is reporter-scoped server-side
  // for anyone without `manage:tickets`, so a customer only ever receives their
  // own cases. Filtering here as well would just hide a scoping bug.
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
      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}
      {!isLoading && !isError && (
        <TicketTable tickets={tickets ?? []} detailBasePath="/client/support" hideOrgColumn />
      )}
      <NewTicketModal open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
