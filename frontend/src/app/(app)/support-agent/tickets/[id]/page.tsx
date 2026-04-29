'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';

export default function SupportAgentTicketDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Ticket detail"
        breadcrumbs={[{ label: 'Tickets', href: '/support-agent/tickets' }, { label: id }]}
        actions={
          <Button
            component={Link}
            href="/support-agent/tickets"
            startIcon={<ArrowBackIcon />}
            variant="text"
          >
            Back to queue
          </Button>
        }
      />
      <TicketDetail ticketId={id} mode="full" viewerKind="agent" />
    </Box>
  );
}
