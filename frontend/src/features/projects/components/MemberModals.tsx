'use client';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormSelectField } from '@/components/form/FormSelectField';
import { FormTextField } from '@/components/form/FormTextField';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { ProjectMember } from '@/types/project.types';

const addMemberSchema = z.object({
  userId: z.string().min(1, 'Select a user'),
  role: z.string().optional(),
});
type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberModalProps {
  open: boolean;
  /** Current members — used to exclude users who are already on the project. */
  existingMembers: ProjectMember[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: AddMemberFormValues) => void;
}

export function AddMemberModal({ open, existingMembers, isLoading, error, onClose, onSubmit }: AddMemberModalProps) {
  const { data: users } = useUsers();
  const { control, handleSubmit, reset } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { userId: '', role: '' },
  });
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  const options = useMemo(() => {
    const memberIds = new Set(existingMembers.map((m) => m.id));
    return (users ?? [])
      .filter((u) => !memberIds.has(u.id))
      .map((u) => ({ label: `${u.firstName} ${u.lastName} — ${u.email}`, value: u.id }));
  }, [users, existingMembers]);

  return (
    <AppModal open={open} onClose={onClose} title="Add member"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Add member</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        {options.length === 0 && !error && (
          <Alert severity="info">Every organization user is already a member of this project.</Alert>
        )}
        <FormSelectField name="userId" control={control} label="User" options={options} />
        <FormTextField name="role" control={control} label="Project role (optional)" fullWidth placeholder="e.g. Site Engineer, Foreman" />
      </Stack>
    </AppModal>
  );
}
