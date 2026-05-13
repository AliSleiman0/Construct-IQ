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
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { invoicesForOrg, type InvoiceStatus } from '@/mocks/billing.mock';
import { useAuthStore } from '@/store/auth.store';

const STATUS_COLOR: Record<InvoiceStatus, 'success' | 'warning' | 'error'> = {
  PAID: 'success',
  DUE: 'warning',
  OVERDUE: 'error',
};

export default function AdminBillingPage() {
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const invoices = user ? invoicesForOrg(user.organization.id) : [];

  return (
    <Box>
      <PageHeader title="Billing" subtitle="Invoices and payment methods for your organization." />

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Invoice</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.number}</TableCell>
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
                  <Chip
                    label={inv.status.toLowerCase()}
                    color={STATUS_COLOR[inv.status]}
                    size="small"
                    sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  ${inv.amountUsd.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => enqueueSnackbar(`Downloaded ${inv.number}`, { variant: 'info' })}
                  >
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
