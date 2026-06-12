'use client';

import { Chip, ChipProps } from '@mui/material';
import type { BidPriceBasis } from '@/types/bids.types';

const STYLES: Record<BidPriceBasis, { color: ChipProps['color']; label: string }> = {
  'lump sum': { color: 'primary', label: 'Lump sum' },
  'labor only': { color: 'warning', label: 'Labor only' },
  'materials only': { color: 'info', label: 'Materials only' },
  'rate based': { color: 'secondary', label: 'Rate-based' },
};

export function BidPriceBasisBadge({ basis }: { basis: BidPriceBasis | string }) {
  const style = (STYLES as Record<string, { color: ChipProps['color']; label: string }>)[basis] ?? {
    color: 'default' as const,
    label: basis,
  };
  return <Chip size="small" color={style.color} label={style.label} variant="filled" />;
}
