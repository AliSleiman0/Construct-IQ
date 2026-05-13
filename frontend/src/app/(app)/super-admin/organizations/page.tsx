'use client';

import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, Button, IconButton, CircularProgress, Tooltip,
} from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useState } from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import {
  useOrganizations,
  useCreateOrganization,
  useSetOrgActive,
} from '@/features/organizations/hooks/useOrganizations';

const EMPTY = { name: '', slug: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' };

export default function OrganizationsPage() {
  const { data: orgs = [], isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const setActive = useSetOrgActive();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleClose = () => { setOpen(false); setForm(EMPTY); };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim()) return;
    await createOrg.mutateAsync({
      name: form.name.trim(),
      slug: form.slug.trim(),
      adminFirstName: form.adminFirstName || 'Admin',
      adminLastName: form.adminLastName || 'User',
      adminEmail: form.adminEmail.trim(),
      adminPassword: form.adminPassword || 'Demo@1234',
    });
    handleClose();
  };

  return (
    <Box>
      <PageHeader
        title="Organizations"
        subtitle="All tenants on ConstructIQ. Suspend or onboard from here."
        actions={
          <AppButton variant="contained" startIcon={<AddBusinessIcon />} onClick={() => setOpen(true)}>
            New organization
          </AppButton>
        }
      />

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Max seats</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(orgs as any[]).map((o: any) => (
                <TableRow key={o._id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{o.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                    {o.slug}
                  </TableCell>
                  <TableCell>
                    <Chip label={o.isActive ? 'Active' : 'Suspended'}
                      color={o.isActive ? 'success' : 'default'} size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{o.maxUsers ?? '∞'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(o.createdAt).format('MMM YYYY')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={o.isActive ? 'Suspend org' : 'Activate org'}>
                      <IconButton size="small"
                        color={o.isActive ? 'warning' : 'success'}
                        disabled={setActive.isPending}
                        onClick={() => setActive.mutate({ id: o._id, isActive: !o.isActive })}>
                        {o.isActive
                          ? <PauseCircleOutlineIcon fontSize="small" />
                          : <PlayCircleOutlineIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>New organization</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Organization name *" value={form.name} onChange={set('name')} autoFocus fullWidth />
            <TextField label="Slug *" value={form.slug} onChange={set('slug')} fullWidth
              placeholder="e.g. company-d" helperText="Lowercase letters, numbers, and hyphens" />
            <Stack direction="row" gap={2}>
              <TextField label="Admin first name" value={form.adminFirstName} onChange={set('adminFirstName')} fullWidth />
              <TextField label="Admin last name" value={form.adminLastName} onChange={set('adminLastName')} fullWidth />
            </Stack>
            <TextField label="Admin email *" value={form.adminEmail} onChange={set('adminEmail')} fullWidth type="email" />
            <TextField label="Admin password" value={form.adminPassword} onChange={set('adminPassword')}
              fullWidth type="password" placeholder="Default: Demo@1234" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || createOrg.isPending}>
            {createOrg.isPending ? 'Creating…' : 'Create organization'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
