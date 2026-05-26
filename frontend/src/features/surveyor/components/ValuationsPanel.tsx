'use client';

import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import VerifiedIcon from '@mui/icons-material/Verified';
import dayjs from 'dayjs';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useValuations } from '../hooks/useValuations';
import { useCreateValuation, useUpdateValuation, useCertifyValuation } from '../hooks/useValuationMutations';
import { CreateValuationModal, EditValuationModal } from './ValuationModals';
import type { Valuation, ValuationStatus } from '@/types/valuation.types';

function money(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `USD ${value.toLocaleString()}`;
  }
}

const STATUS_CHIP: Record<ValuationStatus, { label: string; color: 'default' | 'warning' | 'success' }> = {
  DRAFT: { label: 'Draft', color: 'default' },
  SUBMITTED: { label: 'Submitted', color: 'warning' },
  CERTIFIED: { label: 'Certified', color: 'success' },
};

export function ValuationsPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: rows, isLoading, isError, refetch } = useValuations(projectId);
  const { data: users } = useUsers();
  const userById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  const createValuation = useCreateValuation();
  const updateValuation = useUpdateValuation();
  const certifyValuation = useCertifyValuation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Valuation | null>(null);
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
  const awaitingCount = list.filter((v) => v.status === 'SUBMITTED').length;
  const certifiedValue = list.filter((v) => v.status === 'CERTIFIED').reduce((s, v) => s + (v.amountUsd ?? 0), 0);

  const certifierName = (id?: string | null) => {
    if (!id) return null;
    const u = userById.get(id);
    return u ? `${u.firstName} ${u.lastName}` : null;
  };

  return (
    <Stack gap={2.5}>
      {/* Summary */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          <Metric label="Valuations" value={String(list.length)} />
          <Metric label="Awaiting certification" value={String(awaitingCount)} hint="Submitted, not yet certified" />
          <Metric label="Certified value" value={money(certifiedValue)} hint="Sum of certified valuations" />
        </Box>
      </Paper>

      {/* Valuations */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>Valuations</Typography>
          {canManage && (
            <AppButton size="small" variant="contained" startIcon={<AddIcon />} data-testid="valuation-add"
              onClick={() => { setFormError(null); setCreateOpen(true); }}>
              Raise valuation
            </AppButton>
          )}
        </Box>

        {list.length === 0 ? (
          <AppEmptyState
            title="No valuations yet"
            description={canManage ? 'Raise a progress claim for a billing period, submit it, then certify the value of work in place.' : 'No valuations have been raised for this project yet.'}
          />
        ) : (
          <Table size="small" data-testid="valuations-table">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Retention</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Certified by</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((v) => {
                const chip = STATUS_CHIP[v.status];
                const isDraft = v.status === 'DRAFT';
                const isSubmitted = v.status === 'SUBMITTED';
                return (
                  <TableRow key={v.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{v.period}</Typography></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{money(v.amountUsd)}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{money(v.retentionUsd)}</TableCell>
                    <TableCell><Chip size="small" label={chip.label} color={chip.color} variant="outlined" /></TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {v.status === 'CERTIFIED'
                          ? `${certifierName(v.certifiedById) ?? '—'}${v.certifiedAt ? ` · ${dayjs(v.certifiedAt).format('MMM D, YYYY')}` : ''}`
                          : '—'}
                      </Typography>
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        {/* Submit / Edit only while DRAFT; Certify only while SUBMITTED; CERTIFIED is terminal. */}
                        {isDraft && (
                          <>
                            <Tooltip title="Submit for certification">
                              <span>
                                <IconButton size="small" color="primary" aria-label={`Submit ${v.period}`} data-testid={`valuation-submit-${v.id}`}
                                  disabled={updateValuation.isPending}
                                  onClick={async () => {
                                    if (!confirm(`Submit valuation "${v.period}" for certification?`)) return;
                                    await updateValuation.mutateAsync({ id: v.id, payload: { status: 'SUBMITTED' } });
                                  }}>
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" aria-label={`Edit ${v.period}`} data-testid={`valuation-edit-${v.id}`}
                                onClick={() => { setFormError(null); setEditItem(v); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {isSubmitted && (
                          <Tooltip title="Certify">
                            <span>
                              <IconButton size="small" color="success" aria-label={`Certify ${v.period}`} data-testid={`valuation-certify-${v.id}`}
                                disabled={certifyValuation.isPending}
                                onClick={async () => {
                                  if (!confirm(`Certify valuation "${v.period}"?`)) return;
                                  await certifyValuation.mutateAsync(v.id);
                                }}>
                                <VerifiedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CreateValuationModal
        open={createOpen}
        isLoading={createValuation.isPending}
        error={formError}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (val) => {
          setFormError(null);
          try {
            await createValuation.mutateAsync({
              projectId,
              period: val.period,
              amountUsd: val.amountUsd,
              retentionUsd: val.retentionUsd,
            });
            setCreateOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to raise valuation');
          }
        }}
      />
      <EditValuationModal
        open={!!editItem}
        valuation={editItem}
        isLoading={updateValuation.isPending}
        error={formError}
        onClose={() => setEditItem(null)}
        onSubmit={async (val) => {
          if (!editItem) return;
          setFormError(null);
          try {
            await updateValuation.mutateAsync({
              id: editItem.id,
              payload: { amountUsd: val.amountUsd, retentionUsd: val.retentionUsd },
            });
            setEditItem(null);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to update valuation');
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
