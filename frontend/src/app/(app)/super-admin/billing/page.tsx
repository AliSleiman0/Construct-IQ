'use client';

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { mockInvoices, type InvoiceStatus } from '@/mocks/billing.mock';

const STATUS_COLOR: Record<InvoiceStatus, 'success' | 'warning' | 'error'> = {
  PAID: 'success',
  DUE: 'warning',
  OVERDUE: 'error',
};

export default function SuperAdminBillingPage() {
  const total = mockInvoices.reduce((s, i) => s + i.amountUsd, 0);
  const collected = mockInvoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + i.amountUsd, 0);
  const due = mockInvoices.filter((i) => i.status === 'DUE').length;
  const overdue = mockInvoices.filter((i) => i.status === 'OVERDUE').length;

  return (
    <Box>
      <PageHeader title="Billing" subtitle="System-wide invoices and revenue." />

      <StatGrid>
        <StatCard label="Total billed" value={`$${total.toLocaleString()}`} hint="Last 6 months" icon={ReceiptLongIcon} tone="primary" />
        <StatCard label="Collected" value={`$${collected.toLocaleString()}`} hint={`${Math.round((collected / total) * 100)}% of billed`} icon={AttachMoneyIcon} tone="success" />
        <StatCard label="Open invoices" value={String(due)} icon={HourglassEmptyIcon} tone="warning" />
        <StatCard label="Overdue" value={String(overdue)} icon={WarningAmberIcon} tone="error" />
      </StatGrid>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Invoice</TableCell>
              <TableCell>Org</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockInvoices.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.number}</TableCell>
                <TableCell>{inv.orgName}</TableCell>
                <TableCell>{inv.planName}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(inv.issuedAt).format('MMM D, YYYY')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(inv.dueAt).format('MMM D, YYYY')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={inv.status.toLowerCase()} color={STATUS_COLOR[inv.status]} size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  ${inv.amountUsd.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
