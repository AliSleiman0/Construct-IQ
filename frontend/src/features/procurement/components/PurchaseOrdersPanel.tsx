'use client';

import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import dayjs from 'dayjs';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { usePurchaseOrders, useCreatePO, useUpdatePO, useApprovePO, useRejectPO, useDeletePO } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { CreatePOModal, EditPOModal } from './ProcurementModals';
import { POStatusChip } from './ProcurementChips';
import type { PurchaseOrder } from '@/types/procurement.types';

function money(value?: number | null, currency = 'USD'): string {
  if (value == null) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `${currency} ${value.toLocaleString()}`; }
}

export function PurchaseOrdersPanel({
  canCreate, canApprove, canManage,
}: { canCreate: boolean; canApprove: boolean; canManage: boolean }) {
  const { data: pos, isLoading, isError, refetch } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: projects } = useProjects();
  const createPO = useCreatePO();
  const updatePO = useUpdatePO();
  const approvePO = useApprovePO();
  const rejectPO = useRejectPO();
  const deletePO = useDeletePO();

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; poNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const supplierName = useMemo(() => {
    const m = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [suppliers]);

  if (isLoading) return <Skeleton variant="rounded" height={240} />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  const rows = pos ?? [];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>Purchase orders</Typography>
        {canCreate && (
          <AppButton size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => { setFormError(null); setModalOpen(true); }}>
            Create PO
          </AppButton>
        )}
      </Box>

      {rows.length === 0 ? (
        <AppEmptyState title="No purchase orders" description={canCreate ? 'Create your first purchase order.' : 'No purchase orders yet.'} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>PO #</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Order date</TableCell>
              {(canApprove || canManage) && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((po) => (
              <TableRow key={po.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{po.poNumber}</Typography></TableCell>
                <TableCell>{supplierName(po.supplierId)}</TableCell>
                <TableCell><POStatusChip status={po.status} /></TableCell>
                <TableCell align="right">{money(po.totalAmount, po.currency)}</TableCell>
                <TableCell>{po.orderDate ? dayjs(po.orderDate).format('MMM D, YYYY') : '—'}</TableCell>
                {(canApprove || canManage) && (
                  <TableCell align="right">
                    {canApprove && po.status === 'SUBMITTED' && (
                      <>
                        <Tooltip title="Approve">
                          <span>
                            <IconButton size="small" color="success" aria-label={`Approve ${po.poNumber}`} disabled={approvePO.isPending}
                              onClick={async () => { await approvePO.mutateAsync(po.id); }}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <span>
                            <IconButton size="small" color="warning" aria-label={`Reject ${po.poNumber}`} disabled={rejectPO.isPending}
                              onClick={() => { setRejectTarget({ id: po.id, poNumber: po.poNumber }); setRejectReason(''); }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    {canManage && (
                      <Tooltip title="Edit">
                        <span>
                          <IconButton size="small" aria-label={`Edit ${po.poNumber}`}
                            onClick={() => { setEditTarget(po); setEditError(null); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {canManage && (
                      <Tooltip title="Delete">
                        <span>
                          <IconButton size="small" color="error" aria-label={`Delete ${po.poNumber}`} disabled={deletePO.isPending}
                            onClick={async () => { if (confirm(`Delete PO "${po.poNumber}"?`)) await deletePO.mutateAsync(po.id); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreatePOModal
        open={modalOpen}
        projects={projects ?? []}
        suppliers={suppliers ?? []}
        isLoading={createPO.isPending}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          setFormError(null);
          try {
            await createPO.mutateAsync(payload);
            setModalOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to create purchase order');
          }
        }}
      />

      <EditPOModal
        open={!!editTarget}
        po={editTarget}
        isLoading={updatePO.isPending}
        error={editError}
        onClose={() => setEditTarget(null)}
        onSubmit={async (payload) => {
          if (!editTarget) return;
          setEditError(null);
          try {
            await updatePO.mutateAsync({ id: editTarget.id, payload });
            setEditTarget(null);
          } catch (e: any) {
            setEditError(e?.response?.data?.message ?? 'Failed to update purchase order');
          }
        }}
      />

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject PO &quot;{rejectTarget?.poNumber}&quot;</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            minRows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={() => setRejectTarget(null)}>Cancel</AppButton>
          <AppButton variant="contained" color="error" loading={rejectPO.isPending}
            onClick={async () => {
              if (!rejectTarget) return;
              await rejectPO.mutateAsync({ id: rejectTarget.id, reason: rejectReason });
              setRejectTarget(null);
            }}>
            Reject
          </AppButton>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
