'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';

export default function ClientSupportDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Ticket detail"
        breadcrumbs={[{ label: 'Support', href: '/client/support' }, { label: id }]}
        actions={
          <Button
            component={Link}
            href="/client/support"
            startIcon={<ArrowBackIcon />}
            variant="text"
          >
            Back
          </Button>
        }
      />
      <TicketDetail ticketId={id} mode="read" viewerKind="customer" />
    </Box>
  );
}
