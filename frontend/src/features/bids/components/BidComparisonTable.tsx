'use client';

import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { Bid } from '@/types/bids.types';
import { BidPriceBasisBadge } from './BidPriceBasisBadge';

interface BidComparisonTableProps {
  bids: Bid[];
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function BidComparisonTable({ bids }: BidComparisonTableProps) {
  const completed = bids.filter(
    (b) => b.extractionStatus === 'COMPLETE' && b.extractedData,
  );

  if (completed.length === 0) return null;

  const lowestPriceBidId = completed.reduce((acc, b) => {
    if (!acc) return b.id;
    const accPrice = bids.find((x) => x.id === acc)?.extractedData?.total_price ?? Infinity;
    const bPrice = b.extractedData?.total_price ?? Infinity;
    return bPrice < accPrice ? b.id : acc;
  }, '' as string);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Side-by-side comparison
        </Typography>
        <Tooltip title="Lowest total price — confirm price basis matches before selecting">
          <Typography variant="caption" color="text.secondary">
            Lowest highlighted &mdash; check price basis before selecting.
          </Typography>
        </Tooltip>
      </Stack>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contractor</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Basis</TableCell>
              <TableCell align="right">Advance %</TableCell>
              <TableCell align="right">Validity (d)</TableCell>
              <TableCell align="right">Warranty (mo)</TableCell>
              <TableCell align="right">Scope %</TableCell>
              <TableCell align="right">Flags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {completed.map((bid) => {
              const d = bid.extractedData!;
              const isLowest = bid.id === lowestPriceBidId;
              return (
                <TableRow
                  key={bid.id}
                  hover
                  sx={{
                    bgcolor: isLowest ? 'success.50' : undefined,
                  }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {isLowest && (
                        <StarIcon fontSize="inherit" color="success" />
                      )}
                      <Typography variant="body2" fontWeight={isLowest ? 700 : 500}>
                        {d.contractor}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={isLowest ? 700 : 500}>
                      {formatCurrency(d.total_price, d.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <BidPriceBasisBadge basis={d.price_basis} />
                  </TableCell>
                  <TableCell align="right">
                    {d.payment_terms.advance_percent != null
                      ? `${d.payment_terms.advance_percent}%`
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {d.validity_days != null ? d.validity_days : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {d.warranty_months != null ? d.warranty_months : '—'}
                  </TableCell>
                  <TableCell align="right">{d.scope_completeness_score}%</TableCell>
                  <TableCell align="right">
                    {d.red_flags.length > 0 ? (
                      <Typography
                        variant="body2"
                        color={d.red_flags.length > 1 ? 'error.main' : 'warning.main'}
                        fontWeight={600}
                      >
                        {d.red_flags.length}
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
