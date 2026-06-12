'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { Bid } from '@/types/bids.types';
import { BidPriceBasisBadge } from './BidPriceBasisBadge';
import { BidScopeBar } from './BidScopeBar';
import { BidRedFlagsList } from './BidRedFlagsList';

interface BidCardProps {
  bid: Bid;
  isLowestPrice?: boolean;
  canDelete?: boolean;
  onDelete?: (bid: Bid) => void;
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

export function BidCard({ bid, isLowestPrice, canDelete, onDelete }: BidCardProps) {
  const data = bid.extractedData;

  if (bid.extractionStatus === 'FAILED') {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'error.light' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ErrorOutlineIcon color="error" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>
                Extraction failed
              </Typography>
            </Stack>
            {canDelete && (
              <IconButton size="small" onClick={() => onDelete?.(bid)} aria-label="delete">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Trade package: <strong>{bid.tradePackage}</strong>
          </Typography>
          {bid.extractionError && (
            <Typography variant="caption" color="error">
              {bid.extractionError}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Pending analysis…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: isLowestPrice ? 'success.main' : 'divider',
        borderWidth: isLowestPrice ? 2 : 1,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box minWidth={0} flexGrow={1}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {data.contractor}
              </Typography>
              {isLowestPrice && (
                <Tooltip title="Lowest total price — confirm price basis matches before selecting">
                  <Chip
                    size="small"
                    color="success"
                    icon={<StarIcon fontSize="small" />}
                    label="Lowest"
                  />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {data.trade}
            </Typography>
          </Box>
          {canDelete && (
            <IconButton size="small" onClick={() => onDelete?.(bid)} aria-label="delete">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        <Stack direction="row" alignItems="baseline" spacing={1} mb={1}>
          <Typography variant="h5" fontWeight={700}>
            {formatCurrency(data.total_price, data.currency)}
          </Typography>
          <BidPriceBasisBadge basis={data.price_basis} />
        </Stack>

        <Typography variant="body2" color="text.secondary" mb={1.5}>
          {data.summary}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Payment
            </Typography>
            <Typography variant="body2">
              {data.payment_terms.advance_percent != null
                ? `${data.payment_terms.advance_percent}% advance — `
                : ''}
              {data.payment_terms.structure || '—'}
            </Typography>
          </Box>

          <Box display="flex" gap={2}>
            <Box flexGrow={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Validity
              </Typography>
              <Typography variant="body2">
                {data.validity_days != null ? `${data.validity_days} days` : '—'}
              </Typography>
            </Box>
            <Box flexGrow={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Warranty
              </Typography>
              <Typography variant="body2">
                {data.warranty_months != null ? `${data.warranty_months} months` : '—'}
              </Typography>
            </Box>
          </Box>

          {data.inclusions.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Inclusions ({data.inclusions.length})
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {data.inclusions.map((item, idx) => (
                  <Chip key={idx} size="small" label={item} variant="outlined" color="success" />
                ))}
              </Box>
            </Box>
          )}

          {data.exclusions.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Exclusions ({data.exclusions.length})
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {data.exclusions.map((item, idx) => (
                  <Chip key={idx} size="small" label={item} variant="outlined" color="warning" />
                ))}
              </Box>
            </Box>
          )}

          <BidScopeBar score={data.scope_completeness_score} />

          {data.red_flags.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Red flags
              </Typography>
              <BidRedFlagsList flags={data.red_flags} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
