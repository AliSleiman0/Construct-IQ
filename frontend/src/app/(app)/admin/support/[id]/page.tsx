'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';

export default function OrgAdminSupportDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Ticket detail"
        breadcrumbs={[{ label: 'Support', href: '/admin/support' }, { label: id }]}
        actions={
          <Button
            component={Link}
            href="/admin/support"
            startIcon={<ArrowBackIcon />}
            variant="text"
          >
            Back to tickets
          </Button>
        }
      />
      <TicketDetail ticketId={id} mode="read" viewerKind="customer" />
    </Box>
  );
}
