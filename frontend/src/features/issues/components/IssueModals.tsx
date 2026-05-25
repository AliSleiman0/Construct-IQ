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
import type { Issue } from '@/types/issue.types';

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(256),
  description: z.string().optional(),
  type: z.enum(['GENERAL', 'TECHNICAL', 'QUALITY', 'SAFETY', 'PROCUREMENT', 'BUDGET']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});
const updateIssueSchema = createIssueSchema.partial().extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
});

type CreateIssueFormValues = z.infer<typeof createIssueSchema>;
type UpdateIssueFormValues = z.infer<typeof updateIssueSchema>;

const TYPE_OPTIONS = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Technical', value: 'TECHNICAL' },
  { label: 'Quality', value: 'QUALITY' },
  { label: 'Safety', value: 'SAFETY' },
  { label: 'Procurement', value: 'PROCUREMENT' },
  { label: 'Budget', value: 'BUDGET' },
];
const SEVERITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];
const STATUS_OPTIONS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

interface CreateIssueModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  /** Prefill the form (e.g. raising a QUALITY issue from a failed inspection). */
  defaults?: Partial<CreateIssueFormValues>;
  onClose: () => void;
  onSubmit: (values: CreateIssueFormValues) => void;
}

const BASE_ISSUE_DEFAULTS: CreateIssueFormValues = { title: '', description: '', type: 'GENERAL', severity: 'MEDIUM' };

export function CreateIssueModal({ open, isLoading, error, defaults, onClose, onSubmit }: CreateIssueModalProps) {
  const { control, handleSubmit, reset } = useForm<CreateIssueFormValues>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: { ...BASE_ISSUE_DEFAULTS, ...defaults },
  });
  // Reset to the (possibly prefilled) defaults each time the modal opens.
  useEffect(() => {
    if (open) reset({ ...BASE_ISSUE_DEFAULTS, ...defaults });
  }, [open, defaults, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Report Issue"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Report Issue</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Issue Title" fullWidth required />
        <FormTextField name="description" control={control} label="Description" fullWidth multiline rows={3} />
        <Stack direction="row" spacing={2}>
          <FormSelectField name="type" control={control} label="Type" options={TYPE_OPTIONS} fullWidth />
          <FormSelectField name="severity" control={control} label="Severity" options={SEVERITY_OPTIONS} fullWidth />
        </Stack>
      </Stack>
    </AppModal>
  );
}

interface EditIssueModalProps {
  open: boolean;
  issue: Issue | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: UpdateIssueFormValues) => void;
}

export function EditIssueModal({ open, issue, isLoading, error, onClose, onSubmit }: EditIssueModalProps) {
  const { control, handleSubmit, reset } = useForm<UpdateIssueFormValues>({
    resolver: zodResolver(updateIssueSchema),
    defaultValues: { title: '', description: '', type: 'GENERAL', severity: 'MEDIUM', status: 'OPEN' },
  });
  useEffect(() => {
    if (issue) reset({ title: issue.title, description: issue.description ?? '', type: issue.type, severity: issue.severity, status: issue.status });
  }, [issue, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit Issue" subtitle={issue?.title ?? ''}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Save Changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Issue Title" fullWidth required />
        <FormTextField name="description" control={control} label="Description" fullWidth multiline rows={3} />
        <Stack direction="row" spacing={2}>
          <FormSelectField name="type" control={control} label="Type" options={TYPE_OPTIONS} fullWidth />
          <FormSelectField name="severity" control={control} label="Severity" options={SEVERITY_OPTIONS} fullWidth />
        </Stack>
        <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
      </Stack>
    </AppModal>
  );
}
