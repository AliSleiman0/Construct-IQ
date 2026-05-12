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

  const dueCount = invoices.filter((i) => i.status === 'DUE').length;
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
  const balance = invoices
    .filter((i) => i.status === 'DUE' || i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.amountUsd, 0);

  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="View invoice history, download receipts, and manage payment methods."
      />

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mb: 3 }}>
        {/* Current balance */}
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}
        >
          <Typography variant="caption" color="text.secondary">Current balance</Typography>
          <Typography variant="h4" fontWeight={500} sx={{ mt: 0.5 }}>
            ${balance.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {dueCount} due &middot; {overdueCount} overdue
          </Typography>
        </Paper>

        {/* Payment method */}
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">Payment method</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box
                sx={{
                  width: 38,
                  height: 26,
                  borderRadius: 1,
                  background: 'linear-gradient(135deg, #1a237e, #283593)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                VISA
              </Box>
              <Typography variant="body2" fontWeight={500}>&bull;&bull;&bull;&bull; 4242</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              Expires 09/28
            </Typography>
          </Box>
          <Button variant="text" size="small">Update</Button>
        </Paper>

        {/* Next invoice */}
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="caption" color="text.secondary">Next invoice</Typography>
          <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
            Jun 1, 2026 &middot; $299.00
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Auto-charged to Visa &bull;&bull;&bull;&bull; 4242
          </Typography>
        </Paper>
      </Box>

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
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'primary.dark', fontWeight: 500 }}>
                  {inv.number}
                </TableCell>
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
                    label={inv.status}
                    color={STATUS_COLOR[inv.status]}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  ${inv.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {inv.status !== 'PAID' && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => enqueueSnackbar(`Payment for ${inv.number} processed.`, { variant: 'success' })}
                      >
                        Pay now
                      </Button>
                    )}
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => enqueueSnackbar(`${inv.number}.pdf downloaded.`, { variant: 'success' })}
                    >
                      PDF
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
