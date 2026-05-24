'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import type { BudgetLine } from '@/types/budget.types';

const amount = z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Must be ≥ 0');

// ── Create budget ──────────────────────────────────────────────────────────────
const budgetSchema = z.object({
  totalAmount: amount,
  currency: z.string().optional(),
  notes: z.string().optional(),
});
export type BudgetFormValues = z.infer<typeof budgetSchema>;

export function CreateBudgetModal({
  open, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: BudgetFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { totalAmount: 0, currency: 'USD', notes: '' },
  });
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Create budget"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Create budget</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="totalAmount" control={control} label="Total budget" type="number" fullWidth />
        <FormTextField name="currency" control={control} label="Currency" fullWidth placeholder="USD" />
        <FormTextField name="notes" control={control} label="Notes (optional)" fullWidth multiline minRows={2} />
      </Stack>
    </AppModal>
  );
}

// ── Add budget line ──────────────────────────────────────────────────────────
const lineSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  plannedAmount: amount,
  description: z.string().optional(),
  notes: z.string().optional(),
});
export type LineFormValues = z.infer<typeof lineSchema>;

export function AddLineModal({
  open, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: LineFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<LineFormValues>({
    resolver: zodResolver(lineSchema),
    defaultValues: { category: '', plannedAmount: 0, description: '', notes: '' },
  });
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Add budget line"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Add line</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="category" control={control} label="Category" fullWidth placeholder="e.g. Concrete, Labour" />
        <FormTextField name="plannedAmount" control={control} label="Planned amount" type="number" fullWidth />
        <FormTextField name="description" control={control} label="Description (optional)" fullWidth />
        <FormTextField name="notes" control={control} label="Notes (optional)" fullWidth multiline minRows={2} />
      </Stack>
    </AppModal>
  );
}

// ── Add expense ──────────────────────────────────────────────────────────────
const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount,
  date: z.string().min(1, 'Date is required'),
  budgetLineId: z.string().optional(),
  reference: z.string().optional(),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function AddExpenseModal({
  open, lines, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  lines: BudgetLine[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { control, handleSubmit, reset } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: '', amount: 0, date: today, budgetLineId: '', reference: '' },
  });
  useEffect(() => { if (!open) reset({ description: '', amount: 0, date: today, budgetLineId: '', reference: '' }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineOptions = [
    { label: 'Unassigned', value: '' },
    ...lines.map((l) => ({ label: l.category, value: l.id })),
  ];

  return (
    <AppModal open={open} onClose={onClose} title="Add expense"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Add expense</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="description" control={control} label="Description" fullWidth />
        <FormTextField name="amount" control={control} label="Amount" type="number" fullWidth />
        <FormTextField name="date" control={control} label="Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
        <FormSelectField name="budgetLineId" control={control} label="Budget line" options={lineOptions} />
        <FormTextField name="reference" control={control} label="Reference (optional)" fullWidth placeholder="Invoice / PO number" />
      </Stack>
    </AppModal>
  );
}
