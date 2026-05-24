'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Stack } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import { DependsOnSelect } from './DependsOnSelect';
import type { Phase } from '@/types/phase.types';

const phaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  status: z
    .enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .default('PLANNING'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  order: z.coerce.number().min(0).optional(),
  dependsOnPhaseIds: z.array(z.string()).optional(),
});

export type PhaseFormValues = z.infer<typeof phaseSchema>;

const STATUS_OPTIONS = [
  { label: 'Planning', value: 'PLANNING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

interface BaseProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: PhaseFormValues) => void;
}

export function CreatePhaseModal({ open, isLoading, error, onClose, onSubmit }: BaseProps) {
  const { control, handleSubmit, reset } = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        description: '',
        status: 'PLANNING',
        startDate: '',
        endDate: '',
        order: 0,
      });
    }
  }, [open, reset]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="New Phase"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>
            Create Phase
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Phase Name" fullWidth required />
        <FormTextField
          name="description"
          control={control}
          label="Description"
          fullWidth
          multiline
          rows={2}
        />
        <Stack direction="row" spacing={2}>
          <FormTextField
            name="startDate"
            control={control}
            label="Start Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <FormTextField
            name="endDate"
            control={control}
            label="End Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
          <FormTextField name="order" control={control} label="Order" type="number" fullWidth />
        </Stack>
      </Stack>
    </AppModal>
  );
}

interface EditPhaseModalProps extends BaseProps {
  phase: Phase | null;
  /** Other phases in the project (candidate dependencies, excluding self). */
  dependencyPhases?: Phase[];
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function EditPhaseModal({
  open,
  phase,
  dependencyPhases = [],
  isLoading,
  error,
  onClose,
  onSubmit,
  onDelete,
  isDeleting,
}: EditPhaseModalProps) {
  const { control, handleSubmit, reset } = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      order: 0,
      dependsOnPhaseIds: [],
    },
  });

  useEffect(() => {
    if (phase) {
      reset({
        name: phase.name,
        description: phase.description ?? '',
        status: phase.status,
        startDate: phase.startDate ? phase.startDate.slice(0, 10) : '',
        endDate: phase.endDate ? phase.endDate.slice(0, 10) : '',
        order: phase.order,
        dependsOnPhaseIds: phase.dependsOnPhaseIds ?? [],
      });
    }
  }, [phase, reset]);

  const depOptions = dependencyPhases
    .filter((p) => p.id !== phase?.id)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Edit Phase"
      subtitle={phase?.name ?? ''}
      actions={
        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          p={2}
          pt={0}
          width="100%"
        >
          {onDelete ? (
            <AppButton
              variant="text"
              color="error"
              onClick={onDelete}
              disabled={isLoading || isDeleting}
              loading={isDeleting}
            >
              Delete
            </AppButton>
          ) : (
            <span />
          )}
          <Stack direction="row" spacing={1}>
            <AppButton variant="outlined" onClick={onClose} disabled={isLoading || isDeleting}>
              Cancel
            </AppButton>
            <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>
              Save Changes
            </AppButton>
          </Stack>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Phase Name" fullWidth required />
        <FormTextField
          name="description"
          control={control}
          label="Description"
          fullWidth
          multiline
          rows={2}
        />
        <Stack direction="row" spacing={2}>
          <FormTextField
            name="startDate"
            control={control}
            label="Start Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <FormTextField
            name="endDate"
            control={control}
            label="End Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
          <FormTextField name="order" control={control} label="Order" type="number" fullWidth />
        </Stack>
        <DependsOnSelect control={control} name="dependsOnPhaseIds" label="Depends on" options={depOptions} />
      </Stack>
    </AppModal>
  );
}
