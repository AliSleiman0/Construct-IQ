'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectDetail } from '@/features/projects/components/ProjectDetail';

export default function AdminProjectDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Project detail"
        breadcrumbs={[{ label: 'Projects', href: '/admin/projects' }, { label: id }]}
        actions={
          <Button component={Link} href="/admin/projects" startIcon={<ArrowBackIcon />} variant="text">
            Back
          </Button>
        }
      />
      <ProjectDetail projectId={id} />
    </Box>
  );
}
