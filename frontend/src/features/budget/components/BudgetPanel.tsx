'use client';

import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, LinearProgress, Tooltip, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import dayjs from 'dayjs';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useBudgetSummary, useExpenses } from '../hooks/useBudget';
import {
  useCreateBudget, useAddBudgetLine, useRemoveBudgetLine, useAddExpense, useRemoveExpense, useUpdateExpense,
} from '../hooks/useBudgetMutations';
import { CreateBudgetModal, AddLineModal, AddExpenseModal, EditExpenseModal } from './BudgetModals';
import type { Expense } from '@/types/budget.types';

function money(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function BudgetPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: budget, isLoading, isError, refetch } = useBudgetSummary(projectId);

  const createBudget = useCreateBudget();
  const addLine = useAddBudgetLine(budget?.id ?? '');
  const removeLine = useRemoveBudgetLine(budget?.id ?? '');
  const addExpense = useAddExpense(budget?.id ?? '');
  const removeExpense = useRemoveExpense(budget?.id ?? '');
  const updateExpense = useUpdateExpense(budget?.id ?? '');
  const { data: expenses } = useExpenses(budget?.id);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Stack gap={2}>
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    );
  }
  if (isError) return <AppErrorState onRetry={refetch} />;

  if (!budget) {
    return (
      <>
        <AppEmptyState
          title="No budget yet"
          description={
            canManage
              ? 'Create a budget for this project to start tracking planned cost vs. spend.'
              : 'No budget has been set up for this project yet.'
          }
          action={
            canManage ? (
              <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => { setFormError(null); setCreateOpen(true); }}>
                Create budget
              </AppButton>
            ) : undefined
          }
        />
        <CreateBudgetModal
          open={createOpen}
          isLoading={createBudget.isPending}
          error={formError}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (v) => {
            setFormError(null);
            try {
              await createBudget.mutateAsync({ projectId, totalAmount: v.totalAmount, currency: v.currency || 'USD', notes: v.notes || undefined });
              setCreateOpen(false);
            } catch (e: any) {
              setFormError(e?.response?.data?.message ?? 'Failed to create budget');
            }
          }}
        />
      </>
    );
  }

  const currency = budget.currency || 'USD';
  const lineCategory = new Map(budget.lines.map((l) => [l.id, l.category]));
  const allocated = budget.lines.reduce((s, l) => s + l.plannedAmount, 0);
  const spent = budget.totalSpent ?? 0;
  const committed = budget.totalCommitted ?? 0;
  const remaining = budget.totalAmount - spent - committed;
  const pctUsed = budget.totalAmount > 0 ? Math.min(100, Math.round(((spent + committed) / budget.totalAmount) * 100)) : 0;

  return (
    <Stack gap={2.5}>
      {/* Summary */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' } }}>
          <Metric label="Total budget" value={money(budget.totalAmount, currency)} />
          <Metric label="Allocated" value={money(allocated, currency)} hint="Sum of line items" />
          <Metric label="Spent" value={money(spent, currency)} />
          <Metric label="Committed" value={money(committed, currency)} hint="Pending POs" color="warning.main" />
          <Metric label="Remaining" value={money(remaining, currency)} color={remaining < 0 ? 'error.main' : 'success.main'} />
        </Box>
        <Box mt={2.5}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">Budget used</Typography>
            <Typography variant="caption" color="text.secondary">{pctUsed}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={pctUsed}
            color={remaining < 0 ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
      </Paper>

      {/* Line items */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>Line items</Typography>
          {canManage && (
            <Stack direction="row" spacing={1}>
              <AppButton size="small" variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => { setFormError(null); setExpenseOpen(true); }}>
                Add expense
              </AppButton>
              <AppButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setFormError(null); setLineOpen(true); }}>
                Add line
              </AppButton>
            </Stack>
          )}
        </Box>

        {budget.lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No line items yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Planned</TableCell>
                <TableCell align="right">Committed</TableCell>
                <TableCell align="right">Spent</TableCell>
                <TableCell align="right">Remaining</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {budget.lines.map((l) => {
                const lineSpent = l.spentAmount ?? 0;
                const lineCommitted = l.committedAmount ?? 0;
                const lineRemaining = l.plannedAmount - lineSpent - lineCommitted;
                return (
                  <TableRow key={l.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{l.category}</Typography>
                      {l.description && (
                        <Typography variant="caption" color="text.secondary">{l.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{money(l.plannedAmount, currency)}</TableCell>
                    <TableCell align="right" sx={{ color: lineCommitted > 0 ? 'warning.main' : 'text.secondary' }}>
                      {money(lineCommitted, currency)}
                    </TableCell>
                    <TableCell align="right">{money(lineSpent, currency)}</TableCell>
                    <TableCell align="right" sx={{ color: lineRemaining < 0 ? 'error.main' : 'text.primary' }}>
                      {money(lineRemaining, currency)}
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Tooltip title="Delete line">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Delete line ${l.category}`}
                              disabled={removeLine.isPending}
                              onClick={async () => {
                                if (!confirm(`Delete budget line "${l.category}"?`)) return;
                                await removeLine.mutateAsync(l.id);
                              }}
                            >
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

      {/* Expense history */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Expenses</Typography>
        {!expenses || expenses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No expenses recorded yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Line</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell align="right">Amount</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{dayjs(e.date).format('MMM D, YYYY')}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{e.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {(e.budgetLineId && lineCategory.get(e.budgetLineId)) || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{e.reference || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">{money(e.amount, e.currency || currency)}</TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <Tooltip title="Edit expense">
                        <IconButton
                          size="small"
                          aria-label={`Edit expense ${e.description}`}
                          onClick={() => { setFormError(null); setEditExpense(e); }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete expense">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Delete expense ${e.description}`}
                            disabled={removeExpense.isPending}
                            onClick={async () => {
                              if (!confirm(`Delete expense "${e.description}"?`)) return;
                              await removeExpense.mutateAsync(e.id);
                            }}
                          >
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

      <AddLineModal
        open={lineOpen}
        isLoading={addLine.isPending}
        error={formError}
        onClose={() => setLineOpen(false)}
        onSubmit={async (v) => {
          setFormError(null);
          try {
            await addLine.mutateAsync({ category: v.category, plannedAmount: v.plannedAmount, description: v.description || undefined, notes: v.notes || undefined });
            setLineOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to add line');
          }
        }}
      />
      <AddExpenseModal
        open={expenseOpen}
        lines={budget.lines}
        isLoading={addExpense.isPending}
        error={formError}
        onClose={() => setExpenseOpen(false)}
        onSubmit={async (v) => {
          setFormError(null);
          try {
            await addExpense.mutateAsync({
              description: v.description,
              amount: v.amount,
              date: v.date,
              budgetLineId: v.budgetLineId || undefined,
              reference: v.reference || undefined,
              currency,
            });
            setExpenseOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to add expense');
          }
        }}
      />
      <EditExpenseModal
        open={!!editExpense}
        expense={editExpense}
        lines={budget.lines}
        isLoading={updateExpense.isPending}
        error={formError}
        onClose={() => setEditExpense(null)}
        onSubmit={async (v) => {
          if (!editExpense) return;
          setFormError(null);
          try {
            await updateExpense.mutateAsync({
              expenseId: editExpense.id,
              payload: {
                description: v.description,
                amount: v.amount,
                date: v.date,
                // Send raw (incl. '' for Unassigned) so re-pointing — or clearing — the line persists.
                budgetLineId: v.budgetLineId ?? '',
                reference: v.reference || undefined,
              },
            });
            setEditExpense(null);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to update expense');
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
      <Typography variant="h6" fontWeight={700} sx={{ color: color ?? 'text.primary' }}>
        {value}
      </Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
}
