'use client';

import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useDeliveries, useCreateDelivery, useUpdateDelivery, useDeleteDelivery } from '../hooks/useDeliveries';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { DeliveryModal } from './ProcurementModals';
import { DeliveryStatusChip } from './ProcurementChips';
import type { Delivery } from '@/types/procurement.types';

export function DeliveriesPanel({ canManage }: { canManage: boolean }) {
  const { data: deliveries, isLoading, isError, refetch } = useDeliveries();
  const { data: pos } = usePurchaseOrders();
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();
  const deleteDelivery = useDeleteDelivery();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const poNumber = useMemo(() => {
    const m = new Map((pos ?? []).map((p) => [p.id, p.poNumber]));
    return (id: string) => m.get(id) ?? '—';
  }, [pos]);

  if (isLoading) return <Skeleton variant="rounded" height={240} />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  const rows = deliveries ?? [];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>Deliveries</Typography>
        {canManage && (
          <AppButton size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormError(null); setModalOpen(true); }}>
            Record delivery
          </AppButton>
        )}
      </Box>

      {rows.length === 0 ? (
        <AppEmptyState title="No deliveries" description={canManage ? 'Record a delivery against a purchase order.' : 'No deliveries yet.'} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>PO #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Delivery date</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{poNumber(d.purchaseOrderId)}</Typography></TableCell>
                <TableCell><DeliveryStatusChip status={d.status} /></TableCell>
                <TableCell>{d.deliveryDate ? dayjs(d.deliveryDate).format('MMM D, YYYY') : '—'}</TableCell>
                {canManage && (
                  <TableCell align="right">
                    <Tooltip title="Update">
                      <IconButton size="small" aria-label={`Update delivery ${poNumber(d.purchaseOrderId)}`} onClick={() => { setEditing(d); setFormError(null); setModalOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton size="small" color="error" aria-label={`Delete delivery ${poNumber(d.purchaseOrderId)}`} disabled={deleteDelivery.isPending}
                          onClick={async () => { if (confirm(`Delete delivery for PO "${poNumber(d.purchaseOrderId)}"?`)) await deleteDelivery.mutateAsync(d.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DeliveryModal
        open={modalOpen}
        delivery={editing}
        purchaseOrders={pos ?? []}
        isLoading={createDelivery.isPending || updateDelivery.isPending}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={async (v) => {
          setFormError(null);
          try {
            if (editing) {
              await updateDelivery.mutateAsync({ id: editing.id, payload: { deliveryDate: v.deliveryDate || undefined, status: v.status as any, notes: v.notes || undefined } });
            } else {
              await createDelivery.mutateAsync({ purchaseOrderId: v.purchaseOrderId, deliveryDate: v.deliveryDate || undefined, status: v.status as any, notes: v.notes || undefined });
            }
            setModalOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to save delivery');
          }
        }}
      />
    </Paper>
  );
}
