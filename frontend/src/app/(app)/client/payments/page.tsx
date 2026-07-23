'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaymentSchedule } from '@/features/payments/components/PaymentSchedule';

export default function ClientPaymentsPage() {
  return (
    <Box>
      <PageHeader
        title="Payments"
        subtitle="Your installment schedule and invoice history."
      />
      {/* No buyerId: /payments is buyer-scoped server-side, so the caller only
          ever receives their own schedule. */}
      <PaymentSchedule />
    </Box>
  );
}
