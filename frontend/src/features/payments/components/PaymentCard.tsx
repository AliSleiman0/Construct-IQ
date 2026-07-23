'use client';

import { Box, Paper, Typography, Chip, LinearProgress } from '@mui/material';
import dayjs from 'dayjs';
import type { Payment, PaymentStatus } from '@/types/unit.types';

/**
 * Backend statuses only. There is no `DUE` status server-side — an unpaid
 * installment is PENDING until its due date passes, after which the backend
 * reports OVERDUE. "Due soon" is therefore derived from `dueDate` here rather
 * than being a status of its own.
 */
const STATUS_COLOR: Record<PaymentStatus, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  PAID: 'success',
  PARTIAL: 'info',
  PENDING: 'default',
  OVERDUE: 'error',
  CANCELLED: 'default',
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partially paid',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

const DUE_SOON_DAYS = 14;

interface PaymentCardProps {
  payment: Payment;
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const daysToDue = dayjs(payment.dueDate).diff(dayjs(), 'day');
  const isOpen = payment.status === 'PENDING' || payment.status === 'PARTIAL';
  const dueSoon = isOpen && daysToDue >= 0 && daysToDue <= DUE_SOON_DAYS;
  const highlight = dueSoon || payment.status === 'OVERDUE';

  const partialPct =
    payment.status === 'PARTIAL' && payment.amountUsd > 0
      ? Math.min(100, Math.round((payment.paidAmountUsd / payment.amountUsd) * 100))
      : null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: highlight ? 'warning.light' : 'divider',
        bgcolor: highlight ? 'rgba(245,158,11,0.04)' : 'background.paper',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' },
        gap: 2,
      }}
    >
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
          <Typography variant="subtitle2" fontWeight={600}>
            {payment.label}
          </Typography>
          <Chip
            label={STATUS_LABEL[payment.status]}
            size="small"
            color={STATUS_COLOR[payment.status]}
            sx={{ fontWeight: 600 }}
          />
          {dueSoon && (
            <Chip label={daysToDue === 0 ? 'Due today' : `Due in ${daysToDue}d`} size="small" color="warning" variant="outlined" />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" component="div">
          Installment {payment.installmentNo} of {payment.totalInstallments}
          {payment.invoiceNumber && ` · Invoice ${payment.invoiceNumber}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Due {dayjs(payment.dueDate).format('MMM D, YYYY')}
          {payment.paidAt && ` · Paid ${dayjs(payment.paidAt).format('MMM D, YYYY')}`}
        </Typography>
        {partialPct !== null && (
          <Box mt={1}>
            <LinearProgress variant="determinate" value={partialPct} sx={{ height: 6, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              ${payment.paidAmountUsd.toLocaleString()} of ${payment.amountUsd.toLocaleString()} received
            </Typography>
          </Box>
        )}
      </Box>

      <Box textAlign="right">
        <Typography variant="h6" fontWeight={700}>
          ${payment.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      </Box>
    </Paper>
  );
}
