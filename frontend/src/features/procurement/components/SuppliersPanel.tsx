'use client';

import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Skeleton, Collapse, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useSupplierPerformance } from '../hooks/useSuppliers';
import { SupplierModal } from './ProcurementModals';
import type { Supplier } from '@/types/procurement.types';

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n.toLocaleString()}`;
}

function PerformanceRow({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useSupplierPerformance(supplierId);
  if (isLoading) return (
    <TableRow>
      <TableCell colSpan={6} sx={{ py: 1, bgcolor: 'action.hover' }}>
        <Skeleton height={24} width={400} />
      </TableCell>
    </TableRow>
  );
  if (!data) return null;
  return (
    <TableRow>
      <TableCell colSpan={6} sx={{ py: 1.5, bgcolor: 'action.hover' }}>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <Box><Typography variant="caption" color="text.secondary">Total Orders</Typography><Typography variant="body2" fontWeight={600}>{data.totalOrders}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Total Value</Typography><Typography variant="body2" fontWeight={600}>{money(data.totalValue)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Delivered</Typography><Typography variant="body2" fontWeight={600}>{data.deliveredOrders}</Typography></Box>
          <Box>
            <Typography variant="caption" color="text.secondary">On-time rate</Typography>
            <Box>
              {data.onTimeRate == null ? (
                <Typography variant="body2" color="text.secondary">—</Typography>
              ) : (
                <Chip
                  size="small"
                  label={`${data.onTimeRate}%`}
                  color={data.onTimeRate >= 80 ? 'success' : data.onTimeRate >= 50 ? 'warning' : 'error'}
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export function SuppliersPanel({ canManage }: { canManage: boolean }) {
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <Skeleton variant="rounded" height={240} />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  const rows = suppliers ?? [];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>Suppliers</Typography>
        {canManage && (
          <AppButton size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormError(null); setModalOpen(true); }}>
            Add supplier
          </AppButton>
        )}
      </Box>

      {rows.length === 0 ? (
        <AppEmptyState title="No suppliers" description={canManage ? 'Add your first supplier.' : 'No suppliers yet.'} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <>
                <TableRow key={s.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={500}>{s.name}</Typography></TableCell>
                  <TableCell>{s.contactName || '—'}</TableCell>
                  <TableCell>{s.email || '—'}</TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Performance">
                      <IconButton size="small" color={expandedId === s.id ? 'primary' : 'default'}
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                        <BarChartIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canManage && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton size="small" aria-label={`Edit ${s.name}`} onClick={() => { setEditing(s); setFormError(null); setModalOpen(true); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <span>
                            <IconButton size="small" color="error" aria-label={`Delete ${s.name}`} disabled={deleteSupplier.isPending}
                              onClick={async () => { if (confirm(`Delete supplier "${s.name}"?`)) await deleteSupplier.mutateAsync(s.id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
                {expandedId === s.id && <PerformanceRow supplierId={s.id} />}
              </>
            ))}
          </TableBody>
        </Table>
      )}

      <SupplierModal
        open={modalOpen}
        supplier={editing}
        isLoading={createSupplier.isPending || updateSupplier.isPending}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          setFormError(null);
          try {
            if (editing) await updateSupplier.mutateAsync({ id: editing.id, payload });
            else await createSupplier.mutateAsync(payload);
            setModalOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to save supplier');
          }
        }}
      />
    </Paper>
  );
}
