'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert, Typography } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import type { BoqItem } from '@/types/boq.types';

const qty = z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Must be ≥ 0');

// SME-VALIDATE: `unit` is free text (e.g. "m²", "tonnes", "each") — not a fixed
// taxonomy. Do not turn this into an enum without QS sign-off.
const boqSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50, 'Max 50 characters'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: qty,
  unitRate: qty,
});
export type BoqFormValues = z.infer<typeof boqSchema>;

function money(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `USD ${value.toLocaleString()}`;
  }
}

/** Live "quantity × rate = total" preview — total is server-derived, shown for confidence. */
function TotalPreview({ control }: { control: any }) {
  const quantity = useWatch({ control, name: 'quantity' });
  const unitRate = useWatch({ control, name: 'unitRate' });
  const total = (Number(quantity) || 0) * (Number(unitRate) || 0);
  return (
    <Typography variant="body2" color="text.secondary">
      Line total: <strong>{money(total)}</strong> <span style={{ opacity: 0.7 }}>(quantity × rate)</span>
    </Typography>
  );
}

const DEFAULTS: BoqFormValues = { code: '', description: '', unit: '', quantity: 0, unitRate: 0 };

export function CreateBoqModal({
  open, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: BoqFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<BoqFormValues>({
    resolver: zodResolver(boqSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => { if (!open) reset(DEFAULTS); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Add BOQ item"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)} data-testid="boq-submit">Add item</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="code" control={control} label="Code" fullWidth placeholder="e.g. C.01.A" />
        <FormTextField name="description" control={control} label="Description" fullWidth />
        <FormTextField name="unit" control={control} label="Unit" fullWidth placeholder="e.g. m², tonnes, each" />
        <FormTextField name="quantity" control={control} label="Quantity" type="number" fullWidth />
        <FormTextField name="unitRate" control={control} label="Unit rate" type="number" fullWidth />
        <TotalPreview control={control} />
      </Stack>
    </AppModal>
  );
}

// Edit reuses the same fields, but `code` is immutable server-side → disabled.
export function EditBoqModal({
  open, item, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  item: BoqItem | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: BoqFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<BoqFormValues>({
    resolver: zodResolver(boqSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => {
    if (item) {
      reset({
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitRate: item.unitRate,
      });
    }
  }, [item, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit BOQ item"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)} data-testid="boq-submit">Save changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="code" control={control} label="Code" fullWidth disabled />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>Code can&apos;t be changed after creation.</Typography>
        <FormTextField name="description" control={control} label="Description" fullWidth />
        <FormTextField name="unit" control={control} label="Unit" fullWidth />
        <FormTextField name="quantity" control={control} label="Quantity" type="number" fullWidth />
        <FormTextField name="unitRate" control={control} label="Unit rate" type="number" fullWidth />
        <TotalPreview control={control} />
      </Stack>
    </AppModal>
  );
}
