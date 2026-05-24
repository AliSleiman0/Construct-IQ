'use client';

import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '../hooks/useSuppliers';
import { SupplierModal } from './ProcurementModals';
import type { Supplier } from '@/types/procurement.types';

export function SuppliersPanel({ canManage }: { canManage: boolean }) {
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{s.name}</Typography></TableCell>
                <TableCell>{s.contactName || '—'}</TableCell>
                <TableCell>{s.email || '—'}</TableCell>
                <TableCell>{s.phone || '—'}</TableCell>
                {canManage && (
                  <TableCell align="right">
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
                  </TableCell>
                )}
              </TableRow>
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
