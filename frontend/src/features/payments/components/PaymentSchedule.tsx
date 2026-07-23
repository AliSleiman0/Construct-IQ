'use client';

import { Box, Paper, Typography, Stack, LinearProgress } from '@mui/material';
import { useMemo } from 'react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { usePayments } from '../hooks/usePayments';
import { PaymentCard } from './PaymentCard';

interface PaymentScheduleProps {
  /**
   * Optional. The backend already scopes payments to the caller, so the buyer
   * portal passes nothing; staff views can pass an id to focus one buyer.
   */
  buyerId?: string;
  unitId?: string;
}

export function PaymentSchedule({ buyerId, unitId }: PaymentScheduleProps) {
  const { data, isLoading, isError, refetch } = usePayments({ buyerId, unitId });

  const schedule = useMemo(() => data ?? [], [data]);

  const { total, paid, pct, history, upcoming } = useMemo(() => {
    const t = schedule.reduce((sum, p) => sum + p.amountUsd, 0);
    // Count what was actually received, so a PARTIAL installment contributes
    // its real amount rather than all-or-nothing.
    const p = schedule.reduce(
      (sum, x) => sum + (x.status === 'PAID' ? x.amountUsd : x.paidAmountUsd ?? 0),
      0,
    );
    return {
      total: t,
      paid: p,
      pct: t === 0 ? 0 : Math.min(100, Math.round((p / t) * 100)),
      history: schedule.filter((x) => x.status === 'PAID'),
      upcoming: schedule.filter((x) => x.status !== 'PAID' && x.status !== 'CANCELLED'),
    };
  }, [schedule]);

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  if (schedule.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          No payment schedule has been set up yet.
        </Typography>
      </Paper>
    );
  }

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
            <PaymentCard key={p.id} payment={p} />
          ))}
          {upcoming.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No upcoming installments — you&apos;re all paid up.
            </Typography>
          )}
        </Stack>
      </Box>

      {history.length > 0 && (
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
      )}
    </Stack>
  );
}
