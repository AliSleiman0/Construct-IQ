'use client';

import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useBoqItems } from '../hooks/useBoq';
import { useCreateBoqItem, useUpdateBoqItem, useDeleteBoqItem } from '../hooks/useBoqMutations';
import { CreateBoqModal, EditBoqModal } from './BoqModals';
import type { BoqItem } from '@/types/boq.types';

function money(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `USD ${value.toLocaleString()}`;
  }
}

export function BoqPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: items, isLoading, isError, refetch } = useBoqItems(projectId);

  const createItem = useCreateBoqItem();
  const updateItem = useUpdateBoqItem();
  const deleteItem = useDeleteBoqItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<BoqItem | null>(null);
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

  const rows = items ?? [];
  const grandTotal = rows.reduce((s, i) => s + (i.totalAmount ?? 0), 0);
  const lockedCount = rows.filter((i) => i.isLocked).length;

  const closeCreate = () => setCreateOpen(false);

  return (
    <Stack gap={2.5}>
      {/* Summary */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          <Metric label="Total items" value={String(rows.length)} />
          <Metric label="Locked" value={String(lockedCount)} hint="Protected from edits" />
          <Metric label="BOQ total" value={money(grandTotal)} hint="Sum of line totals" />
        </Box>
      </Paper>

      {/* Items */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>Bill of quantities</Typography>
          {canManage && (
            <AppButton size="small" variant="contained" startIcon={<AddIcon />} data-testid="boq-add"
              onClick={() => { setFormError(null); setCreateOpen(true); }}>
              Add item
            </AppButton>
          )}
        </Box>

        {rows.length === 0 ? (
          <AppEmptyState
            title="No BOQ items yet"
            description={canManage ? 'Add measured line items to build up the bill of quantities.' : 'No bill of quantities has been set up for this project yet.'}
          />
        ) : (
          <Table size="small" data-testid="boq-table">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{i.code}</Typography></TableCell>
                  <TableCell>{i.description}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell align="right">{i.quantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{money(i.unitRate)}</TableCell>
                  <TableCell align="right">{money(i.totalAmount)}</TableCell>
                  <TableCell>
                    {i.isLocked
                      ? <Chip size="small" icon={<LockIcon />} label="Locked" color="default" variant="outlined" />
                      : <Chip size="small" label="Open" color="success" variant="outlined" />}
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      {/* Locking is one-way: the backend rejects edits to a locked item, so a locked
                          item can't be unlocked or edited via the API. Hide edit/lock once locked. */}
                      {!i.isLocked && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" aria-label={`Edit ${i.code}`} data-testid={`boq-edit-${i.code}`}
                              onClick={() => { setFormError(null); setEditItem(i); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Lock (prevents further edits)">
                            <span>
                              <IconButton size="small" aria-label={`Lock ${i.code}`} data-testid={`boq-lock-${i.code}`}
                                disabled={updateItem.isPending}
                                onClick={async () => {
                                  if (!confirm(`Lock "${i.code}"? Locked items can't be edited afterwards.`)) return;
                                  await updateItem.mutateAsync({ id: i.id, payload: { isLocked: true } });
                                }}>
                                <LockOpenIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Delete">
                        <span>
                          <IconButton size="small" color="error" aria-label={`Delete ${i.code}`} data-testid={`boq-delete-${i.code}`}
                            disabled={deleteItem.isPending}
                            onClick={async () => {
                              if (!confirm(`Delete BOQ item "${i.code}"?`)) return;
                              await deleteItem.mutateAsync(i.id);
                            }}>
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
      </Paper>

      <CreateBoqModal
        open={createOpen}
        isLoading={createItem.isPending}
        error={formError}
        onClose={closeCreate}
        onSubmit={async (v) => {
          setFormError(null);
          try {
            await createItem.mutateAsync({ projectId, ...v });
            closeCreate();
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to add BOQ item');
          }
        }}
      />
      <EditBoqModal
        open={!!editItem}
        item={editItem}
        isLoading={updateItem.isPending}
        error={formError}
        onClose={() => setEditItem(null)}
        onSubmit={async (v) => {
          if (!editItem) return;
          setFormError(null);
          try {
            // `code` is immutable server-side; only send the editable fields.
            await updateItem.mutateAsync({
              id: editItem.id,
              payload: { description: v.description, unit: v.unit, quantity: v.quantity, unitRate: v.unitRate },
            });
            setEditItem(null);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to update BOQ item');
          }
        }}
      />
    </Stack>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
}
