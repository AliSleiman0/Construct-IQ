'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaymentSchedule } from '@/features/payments/components/PaymentSchedule';
import { useAuthStore } from '@/store/auth.store';

export default function ClientPaymentsPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <Box>
      <PageHeader
        title="Payments"
        subtitle="Your installment schedule and invoice history."
      />
      <PaymentSchedule buyerId={user.id} />
    </Box>
  );
}
