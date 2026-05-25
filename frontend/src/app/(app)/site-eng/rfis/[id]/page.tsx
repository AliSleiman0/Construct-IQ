'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { RfiDetailView } from '@/features/rfis/components/RfiDetailView';

export default function SiteEngRfiDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="RFI detail"
        breadcrumbs={[{ label: 'RFIs', href: '/site-eng/rfis' }, { label: id }]}
        actions={
          <Button component={Link} href="/site-eng/rfis" startIcon={<ArrowBackIcon />} variant="text">
            Back
          </Button>
        }
      />
      <RfiDetailView rfiId={id} />
    </Box>
  );
}
