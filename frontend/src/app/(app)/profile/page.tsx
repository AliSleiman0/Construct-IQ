'use client';

import {
  Box,
  Paper,
  Avatar,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS } from '@/config/roles';

export default function ProfilePage() {
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const setUser = useAuthStore((s) => s.setUser);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? '');
  }, [user]);

  if (!user) return null;

  const handleSave = () => {
    setUser({
      ...user,
      firstName: firstName.trim() || user.firstName,
      lastName: lastName.trim() || user.lastName,
      phone: phone.trim() || null,
    });
    enqueueSnackbar('Profile updated.', { variant: 'success' });
  };

  return (
    <Box>
      <PageHeader title="Profile" subtitle="Your personal info and avatar." />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' } }}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}
        >
          <Avatar
            src={user.avatarUrl ?? undefined}
            sx={{
              width: 96,
              height: 96,
              mx: 'auto',
              mb: 2,
              fontSize: '2rem',
              fontWeight: 600,
              bgcolor: 'primary.main',
            }}
          >
            {user.firstName[0]}
            {user.lastName[0]}
          </Avatar>
          <Typography variant="subtitle1" fontWeight={600}>
            {user.firstName} {user.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" mb={2}>
            {user.email}
          </Typography>
          {role && <Chip label={ROLE_LABELS[role]} color="primary" size="small" sx={{ fontWeight: 600 }} />}
          <Divider sx={{ my: 2 }} />
          <Button
            startIcon={<PhotoCameraIcon />}
            variant="outlined"
            fullWidth
            onClick={() => enqueueSnackbar('Avatar upload (demo).', { variant: 'info' })}
          >
            Change avatar
          </Button>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Personal info
          </Typography>
          <Stack gap={2}>
            <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
              />
            </Box>
            <TextField label="Email" value={user.email} fullWidth disabled helperText="Contact support to change your email." />
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              placeholder="+1-555-0000"
            />
            <TextField label="Organization" value={user.organization.name} fullWidth disabled />
          </Stack>

          <Box mt={3} display="flex" justifyContent="flex-end" gap={1.5}>
            <Button variant="text" onClick={() => {
              setFirstName(user.firstName);
              setLastName(user.lastName);
              setPhone(user.phone ?? '');
            }}>
              Reset
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save changes
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
