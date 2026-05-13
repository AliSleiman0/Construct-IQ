'use client';

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  MenuItem,
  Button,
} from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { useState } from 'react';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { mockOrgs } from '@/mocks/orgs.mock';
import { mockPlans } from '@/mocks/plans.mock';

export default function OrganizationsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState(mockPlans[1].id);

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) return;
    enqueueSnackbar(`Organization "${name}" created.`, { variant: 'success' });
    setOpen(false);
    setName('');
    setSlug('');
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

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users / seats</TableCell>
              <TableCell>Projects</TableCell>
              <TableCell>Joined</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockOrgs.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{o.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                  {o.slug}
                </TableCell>
                <TableCell>
                  <Chip
                    label={o.isActive ? 'Active' : 'Suspended'}
                    color={o.isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  {o.userCount} / {o.maxUsers ?? '∞'}
                </TableCell>
                <TableCell>{o.projectCount}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(o.createdAt).format('MMM YYYY')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New organization</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              fullWidth
              placeholder="e.g. company-d"
            />
            <TextField
              select
              label="Initial plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              fullWidth
            >
              {mockPlans.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — ${p.pricePerMonth}/mo
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim() || !slug.trim()}>
            Create organization
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
