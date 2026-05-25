'use client';

import { Chip } from '@mui/material';
import type { PurchaseOrderStatus, DeliveryStatus, MaterialRequestStatus } from '@/types/procurement.types';

type Color = 'default' | 'info' | 'primary' | 'success' | 'warning' | 'error';

const PO_COLOR: Record<PurchaseOrderStatus, Color> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'primary',
  REJECTED: 'error',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

const DELIVERY_COLOR: Record<DeliveryStatus, Color> = {
  PENDING: 'warning',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  DELAYED: 'error',
  CANCELLED: 'error',
};

function label(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ');
}

export function POStatusChip({ status }: { status: PurchaseOrderStatus }) {
  return <Chip size="small" label={label(status)} color={PO_COLOR[status] ?? 'default'} variant="outlined" />;
}

export function DeliveryStatusChip({ status }: { status: DeliveryStatus }) {
  return <Chip size="small" label={label(status)} color={DELIVERY_COLOR[status] ?? 'default'} variant="outlined" />;
}

const MR_COLOR: Record<MaterialRequestStatus, Color> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CONVERTED: 'primary',
};

export function MRStatusChip({ status }: { status: MaterialRequestStatus }) {
  return <Chip size="small" label={label(status)} color={MR_COLOR[status] ?? 'default'} variant="outlined" />;
}
