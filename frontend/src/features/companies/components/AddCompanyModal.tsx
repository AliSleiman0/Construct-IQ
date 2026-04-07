'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { useCreateCompany } from '../hooks/useCompanyMutations';

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  maxUsers: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1, 'Must be at least 1').optional()),
  adminFirstName: z.string().min(1, 'First name is required'),
  adminLastName: z.string().min(1, 'Last name is required'),
  adminEmail: z.string().email('Enter a valid email'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddCompanyModal({ open, onClose }: AddCompanyModalProps) {
  const { mutateAsync: createCompany, isPending } = useCreateCompany();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    await createCompany({
      name: values.name,
      slug: values.slug,
      email: values.email || undefined,
      address: values.address || undefined,
      phone: values.phone || undefined,
      website: values.website || undefined,
      maxUsers: values.maxUsers,
      adminFirstName: values.adminFirstName,
      adminLastName: values.adminLastName,
      adminEmail: values.adminEmail,
      adminPassword: values.adminPassword,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{ pb: 0, fontWeight: 700 }}>Add New Company</DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" mb={2}>
            Company Info
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <FormTextField<FormValues> name="name" control={control} label="Company Name" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField<FormValues> name="slug" control={control} label="Slug" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField<FormValues> name="email" control={control} label="Company Email" type="email" fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField<FormValues> name="phone" control={control} label="Phone" fullWidth />
            </Grid>
            <Grid item xs={12}>
              <FormTextField<FormValues> name="address" control={control} label="Address" fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField<FormValues>
                name="maxUsers"
                control={control}
                label="User Limit"
                type="number"
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" color="text.secondary" mb={2}>
            Admin Account
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormTextField<FormValues> name="adminFirstName" control={control} label="First Name" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField<FormValues> name="adminLastName" control={control} label="Last Name" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField<FormValues> name="adminEmail" control={control} label="Admin Email" type="email" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField<FormValues> name="adminPassword" control={control} label="Admin Password" type="password" required fullWidth />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <AppButton variant="outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </AppButton>
          <AppButton type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={18} color="inherit" /> : 'Create Company'}
          </AppButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
