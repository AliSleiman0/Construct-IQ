'use client';

import { Alert, Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { BidsIndexView } from '@/features/bids/components/BidsIndexView';

export default function ProcurementBidsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canRead = isSuperAdmin || hasPermission('read:bids');

  return (
    <Box>
      <PageHeader
        title="Subcontractor bids"
        subtitle="Compare contractor pricing, terms, and red flags across active projects."
      />
      {!canRead ? (
        <Alert severity="warning">
          You do not have permission to view subcontractor bids.
        </Alert>
      ) : (
        <BidsIndexView projectRouteBase="/procurement/projects" />
      )}
    </Box>
  );
}
