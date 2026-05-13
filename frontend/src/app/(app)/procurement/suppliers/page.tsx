'use client';

import { Box } from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function SuppliersPage() {
  return (
    <Box>
      <PageHeader title="Suppliers" subtitle="Vendor catalog with terms, ratings, and history." />
      <ModulePreview
        title="Supplier directory"
        description="Manage vendor records, contact info, payment terms, performance ratings, and historical PO volume. Coming soon."
        icon={StoreIcon}
        statCards={[
          { label: 'Active', value: '22' },
          { label: 'Onboarding', value: '2' },
          { label: 'Suspended', value: '1' },
        ]}
        comingSoon="Phase 5 — Procurement"
      />
    </Box>
  );
}
