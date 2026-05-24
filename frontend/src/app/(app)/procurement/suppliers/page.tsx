'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { SuppliersPanel } from '@/features/procurement/components/SuppliersPanel';
import { useAuthStore } from '@/store/auth.store';

export default function SuppliersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canManage = isSuperAdmin || hasPermission('manage:suppliers');

  return (
    <Box>
      <PageHeader title="Suppliers" subtitle="Vendor catalog with contact details." />
      <SuppliersPanel canManage={canManage} />
    </Box>
  );
}
