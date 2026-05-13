'use client';

import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import dayjs from 'dayjs';
import type { MockPayment, PaymentStatus } from '@/mocks/payments.mock';

const STATUS_COLOR: Record<PaymentStatus, 'success' | 'warning' | 'default' | 'error'> = {
  PAID: 'success',
  DUE: 'warning',
  PENDING: 'default',
  OVERDUE: 'error',
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  DUE: 'Due now',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
};

interface PaymentCardProps {
  payment: MockPayment;
  onPay?: (payment: MockPayment) => void;
}

export function PaymentCard({ payment, onPay }: PaymentCardProps) {
  const isPayable = payment.status === 'DUE' || payment.status === 'OVERDUE';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: payment.status === 'DUE' ? 'warning.light' : 'divider',
        bgcolor: payment.status === 'DUE' ? 'rgba(245,158,11,0.04)' : 'background.paper',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' },
        gap: 2,
      }}
    >
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle2" fontWeight={600}>
            {payment.label}
          </Typography>
          <Chip
            label={STATUS_LABEL[payment.status]}
            size="small"
            color={STATUS_COLOR[payment.status]}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" component="div">
          Invoice {payment.invoiceNumber}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Due {dayjs(payment.dueDate).format('MMM D, YYYY')}
          {payment.paidAt && ` · Paid ${dayjs(payment.paidAt).format('MMM D, YYYY')}`}
        </Typography>
      </Box>

      <Box textAlign="right">
        <Typography variant="h6" fontWeight={700}>
          ${payment.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
        {isPayable && onPay && (
          <Button variant="contained" size="small" sx={{ mt: 0.5 }} onClick={() => onPay(payment)}>
            Pay now
          </Button>
        )}
      </Box>
    </Paper>
  );
}
