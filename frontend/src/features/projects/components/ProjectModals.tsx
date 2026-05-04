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
import type { Project } from '@/types/project.types';

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(128),
  description: z.string().optional(),
  code: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  currency: z.string().default('USD'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const STATUS_OPTIONS = [
  { label: 'Planning', value: 'PLANNING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const CURRENCY_OPTIONS = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' },
  { label: 'SAR', value: 'SAR' },
  { label: 'AED', value: 'AED' },
];

interface CreateProjectModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}

export function CreateProjectModal({ open, isLoading, error, onClose, onSubmit }: CreateProjectModalProps) {
  const { control, handleSubmit, reset } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '', code: '', location: '', status: 'PLANNING', startDate: '', endDate: '', currency: 'USD' },
  });

  useEffect(() => { if (!open) reset(); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="New Project" subtitle="Create a new construction project."
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Create Project</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Project Name" fullWidth required />
        <Stack direction="row" spacing={2}>
          <FormTextField name="code" control={control} label="Project Code" fullWidth />
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
        </Stack>
        <FormTextField name="location" control={control} label="Location" fullWidth />
        <FormTextField name="description" control={control} label="Description" fullWidth multiline rows={3} />
        <Stack direction="row" spacing={2}>
          <FormTextField name="startDate" control={control} label="Start Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
          <FormTextField name="endDate" control={control} label="End Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
        </Stack>
        <FormSelectField name="currency" control={control} label="Currency" options={CURRENCY_OPTIONS} fullWidth />
      </Stack>
    </AppModal>
  );
}

interface EditProjectModalProps {
  open: boolean;
  project: Project | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}

export function EditProjectModal({ open, project, isLoading, error, onClose, onSubmit }: EditProjectModalProps) {
  const { control, handleSubmit, reset } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '', code: '', location: '', status: 'PLANNING', startDate: '', endDate: '', currency: 'USD' },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description ?? '',
        code: project.code ?? '',
        location: project.location ?? '',
        status: project.status,
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
        currency: project.currency,
      });
    }
  }, [project, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit Project"
      subtitle={project ? project.name : ''}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Save Changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Project Name" fullWidth required />
        <Stack direction="row" spacing={2}>
          <FormTextField name="code" control={control} label="Project Code" fullWidth />
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
        </Stack>
        <FormTextField name="location" control={control} label="Location" fullWidth />
        <FormTextField name="description" control={control} label="Description" fullWidth multiline rows={3} />
        <Stack direction="row" spacing={2}>
          <FormTextField name="startDate" control={control} label="Start Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
          <FormTextField name="endDate" control={control} label="End Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
        </Stack>
        <FormSelectField name="currency" control={control} label="Currency" options={CURRENCY_OPTIONS} fullWidth />
      </Stack>
    </AppModal>
  );
}
