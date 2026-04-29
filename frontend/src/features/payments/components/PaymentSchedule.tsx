'use client';

import { Box, Paper, Typography, Stack, LinearProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { paymentsForBuyer, type MockPayment } from '@/mocks/payments.mock';
import { PaymentCard } from './PaymentCard';

interface PaymentScheduleProps {
  buyerId: string;
}

export function PaymentSchedule({ buyerId }: PaymentScheduleProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  const baseSchedule = paymentsForBuyer(buyerId);
  const schedule: MockPayment[] = baseSchedule.map((p) =>
    paidIds.has(p.id) ? { ...p, status: 'PAID', paidAt: new Date().toISOString() } : p,
  );

  const total = schedule.reduce((sum, p) => sum + p.amountUsd, 0);
  const paid = schedule.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amountUsd, 0);
  const pct = total === 0 ? 0 : Math.min(100, Math.round((paid / total) * 100));

  const handlePay = (payment: MockPayment) => {
    setPaidIds((prev) => new Set(prev).add(payment.id));
    enqueueSnackbar(`Payment of $${payment.amountUsd.toLocaleString()} recorded for ${payment.label}.`, {
      variant: 'success',
    });
  };

  const upcoming = schedule.filter((p) => p.status !== 'PAID');
  const history = schedule.filter((p) => p.status === 'PAID');

  return (
    <Stack gap={3}>
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
      >
        <Box display="flex" alignItems="baseline" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            Contract progress
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ${paid.toLocaleString(undefined, { maximumFractionDigits: 0 })} of ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 10, borderRadius: 1, mb: 0.5 }} />
        <Typography variant="caption" color="text.secondary">
          {pct}% paid · {history.length} of {schedule.length} installments complete
        </Typography>
      </Paper>

      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
          Upcoming
        </Typography>
        <Stack gap={1.5}>
          {upcoming.map((p) => (
            <PaymentCard key={p.id} payment={p} onPay={handlePay} />
          ))}
          {upcoming.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No upcoming installments — you're all paid up.
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
          History
        </Typography>
        <Stack gap={1.5}>
          {history.map((p) => (
            <PaymentCard key={p.id} payment={p} />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
