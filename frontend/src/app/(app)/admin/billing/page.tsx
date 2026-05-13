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
  Skeleton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useInvoices } from '@/features/billing/hooks/useInvoices';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  PAID: 'success',
  ISSUED: 'warning',
  OVERDUE: 'error',
  DRAFT: 'default',
  VOID: 'info',
};

export default function AdminBillingPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: invoices = [], isLoading } = useInvoices();

  const dueCount = invoices.filter((i: any) => i.status === 'ISSUED').length;
  const overdueCount = invoices.filter((i: any) => i.status === 'OVERDUE').length;
  const balance = invoices
    .filter((i: any) => i.status === 'ISSUED' || i.status === 'OVERDUE')
    .reduce((sum: number, i: any) => sum + (i.amountUsd ?? 0), 0);

  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="View invoice history, download receipts, and manage payment methods."
      />

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mb: 3 }}>
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

      {isLoading ? (
        <Skeleton variant="rounded" height={300} />
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Invoice</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box textAlign="center" py={5}>
                      <Typography variant="body2" color="text.secondary">
                        No invoices yet.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv: any) => (
                <TableRow key={inv._id ?? inv.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'primary.dark', fontWeight: 500 }}>
                    {inv.number}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {inv.issuedAt ? dayjs(inv.issuedAt).format('MMM D, YYYY') : '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {inv.dueAt ? dayjs(inv.dueAt).format('MMM D, YYYY') : '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.status}
                      color={STATUS_COLOR[inv.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    ${(inv.amountUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      {inv.status !== 'PAID' && inv.status !== 'VOID' && (
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
      )}
    </Box>
  );
}
