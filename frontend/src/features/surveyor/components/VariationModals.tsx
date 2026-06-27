'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import type { Variation } from '@/types/variation.types';

// impactAmount is SIGNED (+ addition / − deduction) — no min(0).
const variationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  impactAmount: z.coerce.number({ invalid_type_error: 'Enter a number' })
    .refine((n) => n !== 0, 'Impact amount must be non-zero'),
});
export type VariationFormValues = z.infer<typeof variationSchema>;

const DEFAULTS: VariationFormValues = { title: '', description: '', impactAmount: 0 };

export function CreateVariationModal({
  open, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: VariationFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<VariationFormValues>({
    resolver: zodResolver(variationSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => { if (!open) reset(DEFAULTS); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Raise variation"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)} data-testid="variation-submit">Raise variation</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Title" fullWidth />
        <FormTextField name="description" control={control} label="Description (optional)" fullWidth multiline minRows={2} />
        <FormTextField name="impactAmount" control={control} label="Impact amount (± USD)" type="number" fullWidth
          placeholder="Positive = addition, negative = deduction" />
      </Stack>
    </AppModal>
  );
}

export function EditVariationModal({
  open, variation, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  variation: Variation | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: VariationFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<VariationFormValues>({
    resolver: zodResolver(variationSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => {
    if (variation) {
      reset({
        title: variation.title,
        description: variation.description ?? '',
        impactAmount: variation.impactAmount,
      });
    }
  }, [variation, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit variation"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)} data-testid="variation-submit">Save changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Title" fullWidth />
        <FormTextField name="description" control={control} label="Description (optional)" fullWidth multiline minRows={2} />
        <FormTextField name="impactAmount" control={control} label="Impact amount (± USD)" type="number" fullWidth />
      </Stack>
    </AppModal>
  );
}
