'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert, Typography } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import type { Valuation } from '@/types/valuation.types';

const money = z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Must be ≥ 0');

// SME-VALIDATE: `retentionUsd` is a plain manual amount, not a computed % of the
// gross. Do not derive it from a retention rate without QS sign-off.
const valuationSchema = z.object({
  period: z.string().min(1, 'Period is required').max(50, 'Max 50 characters'),
  amountUsd: money,
  retentionUsd: money,
}).refine((v) => v.retentionUsd <= v.amountUsd, {
  message: 'Retention cannot exceed the amount',
  path: ['retentionUsd'],
});
export type ValuationFormValues = z.infer<typeof valuationSchema>;

function fmt(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `USD ${value.toLocaleString()}`;
  }
}

/** Live "amount − retention" preview — pure arithmetic, shown for confidence. */
function NetPreview({ control }: { control: any }) {
  const amountUsd = useWatch({ control, name: 'amountUsd' });
  const retentionUsd = useWatch({ control, name: 'retentionUsd' });
  const net = (Number(amountUsd) || 0) - (Number(retentionUsd) || 0);
  return (
    <Typography variant="body2" color="text.secondary">
      After retention: <strong>{fmt(net)}</strong> <span style={{ opacity: 0.7 }}>(amount − retention)</span>
    </Typography>
  );
}

const DEFAULTS: ValuationFormValues = { period: '', amountUsd: 0, retentionUsd: 0 };

export function CreateValuationModal({
  open, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ValuationFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<ValuationFormValues>({
    resolver: zodResolver(valuationSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => { if (!open) reset(DEFAULTS); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Raise valuation"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)} data-testid="valuation-submit">Raise valuation</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="period" control={control} label="Period" fullWidth placeholder="e.g. April 2026, Q2 2026" />
        <FormTextField name="amountUsd" control={control} label="Amount (USD)" type="number" fullWidth />
        <FormTextField name="retentionUsd" control={control} label="Retention withheld (USD)" type="number" fullWidth />
        <NetPreview control={control} />
      </Stack>
    </AppModal>
  );
}

// Edit reuses the same fields, but `period` is immutable server-side → disabled.
export function EditValuationModal({
  open, valuation, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  valuation: Valuation | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ValuationFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<ValuationFormValues>({
    resolver: zodResolver(valuationSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => {
    if (valuation) {
      reset({
        period: valuation.period,
        amountUsd: valuation.amountUsd,
        retentionUsd: valuation.retentionUsd,
      });
    }
  }, [valuation, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit valuation"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)} data-testid="valuation-submit">Save changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="period" control={control} label="Period" fullWidth disabled />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>Period can&apos;t be changed after creation.</Typography>
        <FormTextField name="amountUsd" control={control} label="Amount (USD)" type="number" fullWidth />
        <FormTextField name="retentionUsd" control={control} label="Retention withheld (USD)" type="number" fullWidth />
        <NetPreview control={control} />
      </Stack>
    </AppModal>
  );
}
