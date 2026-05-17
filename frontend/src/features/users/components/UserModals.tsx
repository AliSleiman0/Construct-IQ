'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Stack, Alert, Divider, Typography } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import type { User, Role } from '@/types/user.types';

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(64),
  lastName: z.string().min(1, 'Last name is required').max(64),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  confirmPassword: z.string().min(1, 'Please confirm the password'),
  roleId: z.string().min(1, 'Please select a role'),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(64),
  lastName: z.string().min(1, 'Last name is required').max(64),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

// ── Create Form ───────────────────────────────────────────────────────────────

interface CreateUserFormProps {
  open: boolean;
  roles: Role[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CreateFormValues) => void;
}

export function CreateUserModal({ open, roles, isLoading, error, onClose, onSubmit }: CreateUserFormProps) {
  const { control, handleSubmit, reset } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleId: '',
      phone: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const roleOptions = roles.map((r) => ({ label: r.name, value: r.id }));

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Add New Team Member"
      subtitle="Fill in all details to create a new user account."
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>
            Create User
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Personal Info */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Personal Information
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormTextField name="firstName" control={control} label="First Name" fullWidth required />
          <FormTextField name="lastName" control={control} label="Last Name" fullWidth required />
        </Stack>
        <FormTextField name="phone" control={control} label="Phone Number" fullWidth />

        <Divider />

        {/* Account */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Account Details
        </Typography>
        <FormTextField name="email" control={control} label="Email Address" type="email" fullWidth required />
        <Stack direction="row" spacing={2}>
          <FormTextField name="password" control={control} label="Password" type="password" fullWidth required />
          <FormTextField name="confirmPassword" control={control} label="Confirm Password" type="password" fullWidth required />
        </Stack>

        <Divider />

        {/* Role & Status */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Role &amp; Access
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormSelectField name="roleId" control={control} label="Role" options={roleOptions} fullWidth />
          <FormSelectField name="status" control={control} label="Initial Status" options={STATUS_OPTIONS} fullWidth />
        </Stack>
      </Stack>
    </AppModal>
  );
}

// ── Edit Form ─────────────────────────────────────────────────────────────────

interface EditUserFormProps {
  open: boolean;
  user: User | null;
  roles: Role[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: EditFormValues) => void;
  onAssignRole: (roleId: string) => void;
  onRemoveRole: (roleId: string) => void;
}

export function EditUserModal({
  open, user, roles, isLoading, error, onClose, onSubmit, onAssignRole, onRemoveRole,
}: EditUserFormProps) {
  const { control, handleSubmit, reset } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', status: 'ACTIVE' },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? '',
        status: user.status,
      });
    }
  }, [user, reset]);

  const assignedRoleIds = new Set(user?.userRoles.map((ur) => ur.role.id));
  const availableRoles = roles.filter((r) => !assignedRoleIds.has(r.id));

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Edit User"
      subtitle={user ? `${user.firstName} ${user.lastName} · ${user.email}` : ''}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>
            Save Changes
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" spacing={2}>
          <FormTextField name="firstName" control={control} label="First Name" fullWidth />
          <FormTextField name="lastName" control={control} label="Last Name" fullWidth />
        </Stack>
        <FormTextField name="phone" control={control} label="Phone (optional)" fullWidth />
        <FormSelectField name="status" control={control} label="Status" options={STATUS_OPTIONS} fullWidth />

        <Divider />
        <Typography variant="subtitle2" fontWeight={600}>Assigned Roles</Typography>

        <Stack spacing={1}>
          {user?.userRoles.map((ur) => (
            <Stack key={ur.role.id} direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">{ur.role.name}</Typography>
              <AppButton size="small" color="error" variant="outlined" onClick={() => onRemoveRole(ur.role.id)}>
                Remove
              </AppButton>
            </Stack>
          ))}
          {availableRoles.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">Add another role:</Typography>
              {availableRoles.map((r) => (
                <Stack key={r.id} direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">{r.name}</Typography>
                  <AppButton size="small" variant="outlined" onClick={() => onAssignRole(r.id)}>
                    Assign
                  </AppButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </AppModal>
  );
}
