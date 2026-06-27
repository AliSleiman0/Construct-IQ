'use client';

import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import dayjs from 'dayjs';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useVariations } from '../hooks/useVariations';
import {
  useCreateVariation, useUpdateVariation, useApproveVariation, useRejectVariation, useDeleteVariation,
} from '../hooks/useVariationMutations';
import { CreateVariationModal, EditVariationModal } from './VariationModals';
import type { Variation, VariationStatus } from '@/types/variation.types';

function money(value: number): string {
  const abs = Math.abs(value);
  const formatted = (() => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(abs);
    } catch {
      return `USD ${abs.toLocaleString()}`;
    }
  })();
  return value < 0 ? `−${formatted}` : `+${formatted}`;
}

const STATUS_CHIP: Record<VariationStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
  PENDING: { label: 'Pending', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
};

export function VariationsPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: rows, isLoading, isError, refetch } = useVariations(projectId);
  const { data: users } = useUsers();
  const userById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  const createVariation = useCreateVariation();
  const updateVariation = useUpdateVariation();
  const approveVariation = useApproveVariation();
  const rejectVariation = useRejectVariation();
  const deleteVariation = useDeleteVariation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Variation | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Stack gap={2}>
        <Skeleton variant="rounded" height={88} />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    );
  }
  if (isError) return <AppErrorState onRetry={refetch} />;

  const list = rows ?? [];
  const pendingCount = list.filter((v) => v.status === 'PENDING').length;
  const netApproved = list.filter((v) => v.status === 'APPROVED').reduce((s, v) => s + (v.impactAmount ?? 0), 0);

  const approverName = (id?: string | null) => {
    if (!id) return null;
    const u = userById.get(id);
    return u ? `${u.firstName} ${u.lastName}` : null;
  };

  return (
    <Stack gap={2.5}>
      {/* Summary */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          <Metric label="Variations" value={String(list.length)} />
          <Metric label="Pending" value={String(pendingCount)} hint="Awaiting approval" />
          <Metric label="Net approved impact" value={money(netApproved)} hint="Sum of approved variations"
            color={netApproved < 0 ? 'error.main' : 'text.primary'} />
        </Box>
      </Paper>

      {/* Variations */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>Variations</Typography>
          {canManage && (
            <AppButton size="small" variant="contained" startIcon={<AddIcon />} data-testid="variation-add"
              onClick={() => { setFormError(null); setCreateOpen(true); }}>
              Raise variation
            </AppButton>
          )}
        </Box>

        {list.length === 0 ? (
          <AppEmptyState
            title="No variations yet"
            description={canManage ? 'Raise a change order to capture its price impact and approval status.' : 'No variations have been raised for this project yet.'}
          />
        ) : (
          <Table size="small" data-testid="variations-table">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell align="right">Impact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Approved by</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((v) => {
                const chip = STATUS_CHIP[v.status];
                const isPending = v.status === 'PENDING';
                return (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{v.title}</Typography>
                      {v.description && <Typography variant="caption" color="text.secondary">{v.description}</Typography>}
                    </TableCell>
                    <TableCell align="right" sx={{ color: v.impactAmount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                      {money(v.impactAmount)}
                    </TableCell>
                    <TableCell><Chip size="small" label={chip.label} color={chip.color} variant="outlined" /></TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {v.status === 'APPROVED'
                          ? `${approverName(v.approvedById) ?? '—'}${v.approvedAt ? ` · ${dayjs(v.approvedAt).format('MMM D, YYYY')}` : ''}`
                          : '—'}
                      </Typography>
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        {/* Edit / Approve / Reject only while PENDING; APPROVED & REJECTED are terminal. */}
                        {isPending && (
                          <>
                            <Tooltip title="Approve">
                              <span>
                                <IconButton size="small" color="success" aria-label={`Approve ${v.title}`} data-testid={`variation-approve-${v.id}`}
                                  disabled={approveVariation.isPending}
                                  onClick={async () => {
                                    if (!confirm(`Approve variation "${v.title}"?`)) return;
                                    await approveVariation.mutateAsync(v.id);
                                  }}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <span>
                                <IconButton size="small" color="warning" aria-label={`Reject ${v.title}`} data-testid={`variation-reject-${v.id}`}
                                  disabled={rejectVariation.isPending}
                                  onClick={async () => {
                                    const reason = prompt(`Reject variation "${v.title}"? Optionally add a reason:`);
                                    if (reason === null) return; // cancelled
                                    await rejectVariation.mutateAsync({ id: v.id, reason: reason || undefined });
                                  }}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" aria-label={`Edit ${v.title}`} data-testid={`variation-edit-${v.id}`}
                                onClick={() => { setFormError(null); setEditItem(v); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Delete">
                          <span>
                            <IconButton size="small" color="error" aria-label={`Delete ${v.title}`} data-testid={`variation-delete-${v.id}`}
                              disabled={deleteVariation.isPending}
                              onClick={async () => {
                                if (!confirm(`Delete variation "${v.title}"?`)) return;
                                await deleteVariation.mutateAsync(v.id);
                              }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CreateVariationModal
        open={createOpen}
        isLoading={createVariation.isPending}
        error={formError}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (val) => {
          setFormError(null);
          try {
            await createVariation.mutateAsync({
              projectId,
              title: val.title,
              impactAmount: val.impactAmount,
              description: val.description || undefined,
            });
            setCreateOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to raise variation');
          }
        }}
      />
      <EditVariationModal
        open={!!editItem}
        variation={editItem}
        isLoading={updateVariation.isPending}
        error={formError}
        onClose={() => setEditItem(null)}
        onSubmit={async (val) => {
          if (!editItem) return;
          setFormError(null);
          try {
            await updateVariation.mutateAsync({
              id: editItem.id,
              payload: { title: val.title, description: val.description || undefined, impactAmount: val.impactAmount },
            });
            setEditItem(null);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to update variation');
          }
        }}
      />
    </Stack>
  );
}

function Metric({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color: color ?? 'text.primary' }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
}
