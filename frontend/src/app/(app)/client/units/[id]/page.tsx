'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { UnitDetail } from '@/features/units/components/UnitDetail';

export default function ClientUnitDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Unit detail"
        breadcrumbs={[{ label: 'Units', href: '/client/units' }, { label: id }]}
        actions={
          <Button component={Link} href="/client/units" startIcon={<ArrowBackIcon />} variant="text">
            Back to gallery
          </Button>
        }
      />
      <UnitDetail unitId={id} />
    </Box>
  );
}
