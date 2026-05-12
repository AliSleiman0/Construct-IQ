'use client';

import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Typography, CircularProgress,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { useInvoices } from '@/features/billing/hooks/useInvoices';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', ISSUED: 'warning', OVERDUE: 'error', DRAFT: 'default', VOID: 'default',
};

export default function SuperAdminBillingPage() {
  const { data: invoices = [], isLoading } = useInvoices();

  const inv = invoices as any[];
  const totalBilled = inv.reduce((s: number, i: any) => s + (i.amountUsd ?? 0), 0);
  const collected = inv.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + (i.amountUsd ?? 0), 0);
  const openCount = inv.filter((i: any) => i.status === 'ISSUED').length;
  const overdueCount = inv.filter((i: any) => i.status === 'OVERDUE').length;

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="System-wide invoices and revenue across all tenants."
      />

      <StatGrid>
        <StatCard label="Total billed" value={fmt(totalBilled)} hint={`${inv.length} invoices`} icon={ReceiptIcon} tone="primary" />
        <StatCard label="Collected" value={fmt(collected)} hint="Paid invoices" icon={CheckCircleOutlineIcon} tone="success" />
        <StatCard label="Open invoices" value={String(openCount)} hint="Awaiting payment" icon={HourglassEmptyIcon} tone="info" />
        <StatCard label="Overdue" value={String(overdueCount)} hint="Past due date" icon={WarningAmberIcon} tone="warning" />
      </StatGrid>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Invoice</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inv.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                inv.map((invoice: any) => (
                  <TableRow key={invoice._id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {invoice.number}
                    </TableCell>
                    <TableCell>{invoice.planId ?? '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(invoice.issuedAt).format('DD MMM YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(invoice.dueAt).format('DD MMM YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={STATUS_COLOR[invoice.status] ?? 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ${(invoice.amountUsd ?? 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
