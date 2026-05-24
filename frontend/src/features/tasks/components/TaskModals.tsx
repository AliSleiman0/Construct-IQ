'use client';
import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stack, Alert, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip, Box,
} from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { Task } from '@/types/task.types';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PREPARATION', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
  dependsOnTaskIds: z.array(z.string()).optional(),
});
export type TaskFormValues = z.infer<typeof taskSchema>;

const STATUS_OPTIONS = [
  { label: 'To Do', value: 'TODO' },
  { label: 'In Preparation', value: 'IN_PREPARATION' },
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

const UNASSIGNED_VALUE = '__unassigned__';

function useAssigneeOptions() {
  const { data: users } = useUsers();
  return useMemo(() => {
    const list = (users ?? []).map((u) => ({
      label: `${u.firstName} ${u.lastName} — ${u.email}`,
      value: u.id,
    }));
    return [{ label: 'Unassigned', value: UNASSIGNED_VALUE }, ...list];
  }, [users]);
}

function normaliseAssignee(value: string | undefined): string | undefined {
  if (!value || value === UNASSIGNED_VALUE) return undefined;
  return value;
}

interface CreateTaskModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  defaultStatus?: TaskFormValues['status'];
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

export function CreateTaskModal({
  open,
  isLoading,
  error,
  defaultStatus = 'TODO',
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  const assigneeOptions = useAssigneeOptions();
  const { control, handleSubmit, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'MEDIUM',
      startDate: '',
      dueDate: '',
      assignedToId: UNASSIGNED_VALUE,
      dependsOnTaskIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'MEDIUM',
        startDate: '',
        dueDate: '',
        assignedToId: UNASSIGNED_VALUE,
      });
    }
  }, [open, defaultStatus, reset]);

  const submit = handleSubmit((values) =>
    onSubmit({ ...values, assignedToId: normaliseAssignee(values.assignedToId) }),
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="New Task"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit}>
            Create Task
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Task Title" fullWidth required />
        <FormTextField
          name="description"
          control={control}
          label="Description"
          fullWidth
          multiline
          rows={2}
        />
        <Stack direction="row" spacing={2}>
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
          <FormSelectField
            name="priority"
            control={control}
            label="Priority"
            options={PRIORITY_OPTIONS}
            fullWidth
          />
        </Stack>
        <FormSelectField
          name="assignedToId"
          control={control}
          label="Assignee"
          options={assigneeOptions}
          fullWidth
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
            name="dueDate"
            control={control}
            label="Due Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Stack>
    </AppModal>
  );
}

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  isLoading: boolean;
  error?: string | null;
  /** Other tasks in the project (excluding this one) to pick dependencies from. */
  dependencyTasks?: Task[];
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

export function EditTaskModal({ open, task, isLoading, error, dependencyTasks, onClose, onSubmit }: EditTaskModalProps) {
  const assigneeOptions = useAssigneeOptions();
  const { control, handleSubmit, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      startDate: '',
      dueDate: '',
      assignedToId: UNASSIGNED_VALUE,
      dependsOnTaskIds: [],
    },
  });

  const depTitle = useMemo(
    () => new Map((dependencyTasks ?? []).map((t) => [t.id, t.title])),
    [dependencyTasks],
  );

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        startDate: task.startDate ? task.startDate.slice(0, 10) : '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assignedToId: task.assignedToId ?? UNASSIGNED_VALUE,
        dependsOnTaskIds: task.dependsOnTaskIds ?? [],
      });
    }
  }, [task, reset]);

  const submit = handleSubmit((values) =>
    onSubmit({ ...values, assignedToId: normaliseAssignee(values.assignedToId) }),
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Edit Task"
      subtitle={task?.title ?? ''}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit}>
            Save Changes
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="title" control={control} label="Task Title" fullWidth required />
        <FormTextField
          name="description"
          control={control}
          label="Description"
          fullWidth
          multiline
          rows={2}
        />
        <Stack direction="row" spacing={2}>
          <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />
          <FormSelectField
            name="priority"
            control={control}
            label="Priority"
            options={PRIORITY_OPTIONS}
            fullWidth
          />
        </Stack>
        <FormSelectField
          name="assignedToId"
          control={control}
          label="Assignee"
          options={assigneeOptions}
          fullWidth
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
            name="dueDate"
            control={control}
            label="Due Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        {dependencyTasks && dependencyTasks.length > 0 && (
          <Controller
            name="dependsOnTaskIds"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel id="depends-on-label">Depends on</InputLabel>
                <Select
                  labelId="depends-on-label"
                  multiple
                  value={field.value ?? []}
                  onChange={(e) =>
                    field.onChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
                  }
                  input={<OutlinedInput label="Depends on" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id) => (
                        <Chip key={id} size="small" label={depTitle.get(id) ?? id} />
                      ))}
                    </Box>
                  )}
                >
                  {dependencyTasks.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        )}
      </Stack>
    </AppModal>
  );
}
