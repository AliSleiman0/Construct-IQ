'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert, Divider, Typography } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import type { OrgListItem } from '@/lib/api/organizations.api';

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(64),
    lastName: z.string().min(1, 'Last name is required').max(64),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
    phone: z.string().optional(),
    organizationId: z.string().min(1, 'Please select an organization'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export interface CreateOrgAdminFormSubmit {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  organizationId: string;
}

interface Props {
  open: boolean;
  organizations: OrgListItem[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CreateOrgAdminFormSubmit) => void;
}

export function CreateOrgAdminModal({
  open,
  organizations,
  isLoading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      organizationId: '',
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const orgOptions = organizations
    .filter((o) => o.isActive)
    .map((o) => ({ label: o.name, value: o.id }));

  const submit = (values: FormValues) =>
    onSubmit({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      phone: values.phone?.trim() ? values.phone : undefined,
      organizationId: values.organizationId,
    });

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Create Org Admin"
      subtitle="Provision a new Organization Admin for any tenant."
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            loading={isLoading}
            onClick={handleSubmit(submit)}
          >
            Create Org Admin
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}

        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Personal Information
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormTextField name="firstName" control={control} label="First Name" fullWidth required />
          <FormTextField name="lastName" control={control} label="Last Name" fullWidth required />
        </Stack>
        <FormTextField name="phone" control={control} label="Phone Number" fullWidth />

        <Divider />

        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Account Details
        </Typography>
        <FormTextField name="email" control={control} label="Email Address" type="email" fullWidth required />
        <Stack direction="row" spacing={2}>
          <FormTextField name="password" control={control} label="Password" type="password" fullWidth required />
          <FormTextField name="confirmPassword" control={control} label="Confirm Password" type="password" fullWidth required />
        </Stack>

        <Divider />

        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
          Organization
        </Typography>
        <FormSelectField
          name="organizationId"
          control={control}
          label="Assign to organization"
          options={orgOptions}
          fullWidth
        />
      </Stack>
    </AppModal>
  );
}
