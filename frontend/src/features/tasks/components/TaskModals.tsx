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
import type { Task } from '@/types/task.types';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(256),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

const STATUS_OPTIONS = [
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Blocked', value: 'BLOCKED' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Done', value: 'DONE' },
];
const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

interface CreateTaskModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

export function CreateTaskModal({ open, isLoading, error, onClose, onSubmit }: CreateTaskModalProps) {
  const { control, handleSubmit, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assigneeId: '' },
  });
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="New Task"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Create Task</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Task Title" fullWidth required />
        <FormTextField name="description" control={control} label="Description" fullWidth multiline rows={2} />
        <Stack direction="row" spacing={2}>
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
          <FormSelectField name="priority" control={control} label="Priority" options={PRIORITY_OPTIONS} fullWidth />
        </Stack>
        <FormTextField name="dueDate" control={control} label="Due Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
      </Stack>
    </AppModal>
  );
}

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

export function EditTaskModal({ open, task, isLoading, error, onClose, onSubmit }: EditTaskModalProps) {
  const { control, handleSubmit, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assigneeId: '' },
  });
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assigneeId: task.assigneeId ?? '',
      });
    }
  }, [task, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit Task" subtitle={task?.title ?? ''}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Save Changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Task Title" fullWidth required />
        <FormTextField name="description" control={control} label="Description" fullWidth multiline rows={2} />
        <Stack direction="row" spacing={2}>
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
          <FormSelectField name="priority" control={control} label="Priority" options={PRIORITY_OPTIONS} fullWidth />
        </Stack>
        <FormTextField name="dueDate" control={control} label="Due Date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
      </Stack>
    </AppModal>
  );
}
