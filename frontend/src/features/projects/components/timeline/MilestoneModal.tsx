'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import { DependsOnSelect } from './DependsOnSelect';
import type { Milestone } from '@/types/milestone.types';
import type { Phase } from '@/types/phase.types';

const UNLINKED_VALUE = '__unlinked__';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
  targetDate: z.string().optional(),
  percentComplete: z.coerce.number().min(0).max(100).optional(),
  phaseId: z.string().optional(),
  isMajor: z.boolean().optional(),
  dependsOnMilestoneIds: z.array(z.string()).optional(),
});

export type MilestoneFormValues = z.infer<typeof milestoneSchema>;

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

function usePhaseOptions(phases: Phase[]) {
  return useMemo(() => {
    return [
      { label: 'Not linked to a phase', value: UNLINKED_VALUE },
      ...phases.map((p) => ({ label: p.name, value: p.id })),
    ];
  }, [phases]);
}

function normalisePhase(value: string | undefined): string | undefined {
  if (!value || value === UNLINKED_VALUE) return undefined;
  return value;
}

function MajorCheckbox({ control }: { control: Control<MilestoneFormValues> }) {
  return (
    <Controller
      name="isMajor"
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
          label="Major milestone (large diamond on the timeline)"
        />
      )}
    />
  );
}

interface BaseProps {
  open: boolean;
  phases: Phase[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: MilestoneFormValues) => void;
}

export function CreateMilestoneModal({ open, phases, isLoading, error, onClose, onSubmit }: BaseProps) {
  const phaseOptions = usePhaseOptions(phases);
  const { control, handleSubmit, reset } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'PENDING',
      targetDate: '',
      percentComplete: 0,
      phaseId: UNLINKED_VALUE,
      isMajor: false,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        description: '',
        status: 'PENDING',
        targetDate: '',
        percentComplete: 0,
        phaseId: UNLINKED_VALUE,
        isMajor: false,
      });
    }
  }, [open, reset]);

  const submit = handleSubmit((values) =>
    onSubmit({ ...values, phaseId: normalisePhase(values.phaseId) }),
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="New Milestone"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit}>
            Create Milestone
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Milestone Name" fullWidth required />
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
            name="targetDate"
            control={control}
            label="Target Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <FormSelectField
            name="status"
            control={control}
            label="Status"
            options={STATUS_OPTIONS}
            fullWidth
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <FormSelectField
            name="phaseId"
            control={control}
            label="Phase"
            options={phaseOptions}
            fullWidth
          />
          <FormTextField
            name="percentComplete"
            control={control}
            label="Percent Complete"
            type="number"
            fullWidth
          />
        </Stack>
        <MajorCheckbox control={control} />
      </Stack>
    </AppModal>
  );
}

interface EditMilestoneModalProps extends BaseProps {
  milestone: Milestone | null;
  /** Other milestones in the project (candidate dependencies, excluding self). */
  dependencyMilestones?: Milestone[];
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function EditMilestoneModal({
  open,
  milestone,
  phases,
  dependencyMilestones = [],
  isLoading,
  error,
  onClose,
  onSubmit,
  onDelete,
  isDeleting,
}: EditMilestoneModalProps) {
  const phaseOptions = usePhaseOptions(phases);
  const { control, handleSubmit, reset } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'PENDING',
      targetDate: '',
      percentComplete: 0,
      phaseId: UNLINKED_VALUE,
      isMajor: false,
      dependsOnMilestoneIds: [],
    },
  });

  useEffect(() => {
    if (milestone) {
      reset({
        name: milestone.name,
        description: milestone.description ?? '',
        status: milestone.status,
        targetDate: milestone.targetDate ? milestone.targetDate.slice(0, 10) : '',
        percentComplete: milestone.percentComplete,
        phaseId: milestone.phaseId ?? UNLINKED_VALUE,
        isMajor: milestone.isMajor ?? false,
        dependsOnMilestoneIds: milestone.dependsOnMilestoneIds ?? [],
      });
    }
  }, [milestone, reset]);

  const depOptions = dependencyMilestones
    .filter((m) => m.id !== milestone?.id)
    .map((m) => ({ id: m.id, name: m.name }));

  const submit = handleSubmit((values) =>
    onSubmit({ ...values, phaseId: normalisePhase(values.phaseId) }),
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Edit Milestone"
      subtitle={milestone?.name ?? ''}
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
            <AppButton variant="contained" loading={isLoading} onClick={submit}>
              Save Changes
            </AppButton>
          </Stack>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Milestone Name" fullWidth required />
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
            name="targetDate"
            control={control}
            label="Target Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <FormSelectField
            name="status"
            control={control}
            label="Status"
            options={STATUS_OPTIONS}
            fullWidth
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <FormSelectField
            name="phaseId"
            control={control}
            label="Phase"
            options={phaseOptions}
            fullWidth
          />
          <FormTextField
            name="percentComplete"
            control={control}
            label="Percent Complete"
            type="number"
            fullWidth
          />
        </Stack>
        <MajorCheckbox control={control} />
        <DependsOnSelect control={control} name="dependsOnMilestoneIds" label="Depends on" options={depOptions} />
      </Stack>
    </AppModal>
  );
}
