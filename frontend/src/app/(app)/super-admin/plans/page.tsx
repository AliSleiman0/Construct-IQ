'use client';

import {
  Box, Card, CardContent, Typography, List, ListItem, ListItemIcon,
  ListItemText, Chip, CircularProgress, IconButton, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, MenuItem, Switch, FormControlLabel, Divider, InputAdornment,
  Checkbox, FormGroup, FormControlLabel as FcLabel,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/features/plans/hooks/usePlans';
import { usePlatformFeatures } from '@/features/platform-features/hooks/usePlatformFeatures';
import { useState } from 'react';

const TIERS = ['STARTER', 'PRO', 'ENTERPRISE'];

interface PlanForm {
  name: string;
  tier: string;
  pricePerMonth: string;
  maxUsers: string;
  maxProjects: string;
  description: string;
  isPopular: boolean;
  featureKeys: string[];   // list of Feature.key values
}

const EMPTY_FORM: PlanForm = {
  name: '', tier: 'STARTER', pricePerMonth: '', maxUsers: '',
  maxProjects: '', description: '', isPopular: false, featureKeys: [],
};

// ── Feature checkbox picker ───────────────────────────────────────────────────
function FeaturePicker({
  allFeatures,
  selected,
  onChange,
}: {
  allFeatures: any[];
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    );

  if (allFeatures.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No features in catalog yet. Go to Features to create some.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Included features
      </Typography>
      <FormGroup sx={{ mt: 0.75 }}>
        {allFeatures.map((f: any) => (
          <FcLabel
            key={f._id}
            control={
              <Checkbox
                size="small"
                checked={selected.includes(f.key)}
                onChange={() => toggle(f.key)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={500}>{f.name}</Typography>
                {f.description && (
                  <Typography variant="caption" color="text.secondary">{f.description}</Typography>
                )}
              </Box>
            }
            sx={{ alignItems: 'flex-start', mb: 0.5 }}
          />
        ))}
      </FormGroup>
    </Box>
  );
}

// ── Shared create/edit dialog ─────────────────────────────────────────────────
function PlanDialog({
  open, title, form, tierLocked, saving, allFeatures,
  onChange, onFeatureKeys, onClose, onSubmit,
}: {
  open: boolean;
  title: string;
  form: PlanForm;
  tierLocked: boolean;
  saving: boolean;
  allFeatures: any[];
  onChange: (k: keyof PlanForm, v: any) => void;
  onFeatureKeys: (keys: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const valid =
    form.name.trim() &&
    form.pricePerMonth !== '' && Number(form.pricePerMonth) >= 0 &&
    form.maxUsers !== '' && Number(form.maxUsers) >= 1 &&
    form.maxProjects !== '' && Number(form.maxProjects) >= 1;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <Stack direction="row" gap={2}>
            <TextField
              label="Plan name *" value={form.name} fullWidth autoFocus
              onChange={(e) => onChange('name', e.target.value)}
            />
            <TextField
              select label="Tier *" value={form.tier} sx={{ minWidth: 140 }}
              disabled={tierLocked}
              onChange={(e) => onChange('tier', e.target.value)}
            >
              {TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label="Price / month *" value={form.pricePerMonth} fullWidth type="number"
              inputProps={{ min: 0, step: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              onChange={(e) => onChange('pricePerMonth', e.target.value)}
            />
            <TextField
              label="Max users *" value={form.maxUsers} fullWidth type="number"
              inputProps={{ min: 1 }}
              onChange={(e) => onChange('maxUsers', e.target.value)}
            />
            <TextField
              label="Max projects *" value={form.maxProjects} fullWidth type="number"
              inputProps={{ min: 1 }}
              onChange={(e) => onChange('maxProjects', e.target.value)}
            />
          </Stack>

          <TextField
            label="Description" value={form.description} fullWidth multiline minRows={2}
            onChange={(e) => onChange('description', e.target.value)}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.isPopular}
                onChange={(e) => onChange('isPopular', e.target.checked)}
                color="primary"
              />
            }
            label="Mark as most popular"
          />

          <Divider />
          <FeaturePicker
            allFeatures={allFeatures}
            selected={form.featureKeys}
            onChange={onFeatureKeys}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={!valid || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const { data: plans = [], isLoading } = usePlans(true);
  const { data: allFeatures = [] } = usePlatformFeatures(false); // active features only for picker
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PlanForm>(EMPTY_FORM);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState<PlanForm>(EMPTY_FORM);

  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  const setCreate = (k: keyof PlanForm, v: any) => setCreateForm((f) => ({ ...f, [k]: v }));
  const setEdit = (k: keyof PlanForm, v: any) => setEditForm((f) => ({ ...f, [k]: v }));

  const handleCreateClose = () => { setCreateOpen(false); setCreateForm(EMPTY_FORM); };
  const handleCreate = async () => {
    await createPlan.mutateAsync({
      name: createForm.name.trim(),
      tier: createForm.tier,
      pricePerMonth: Number(createForm.pricePerMonth),
      maxUsers: Number(createForm.maxUsers),
      maxProjects: Number(createForm.maxProjects),
      description: createForm.description.trim() || undefined,
      isPopular: createForm.isPopular,
      features: createForm.featureKeys,
    });
    handleCreateClose();
  };

  const handleEditOpen = (plan: any) => {
    setEditId(plan._id);
    setEditForm({
      name: plan.name ?? '',
      tier: plan.tier ?? 'STARTER',
      pricePerMonth: String(plan.pricePerMonth ?? ''),
      maxUsers: String(plan.maxUsers ?? ''),
      maxProjects: String(plan.maxProjects ?? ''),
      description: plan.description ?? '',
      isPopular: plan.isPopular ?? false,
      featureKeys: Array.isArray(plan.features) ? [...plan.features] : [],
    });
    setEditOpen(true);
  };
  const handleEditClose = () => { setEditOpen(false); setEditId(''); setEditForm(EMPTY_FORM); };
  const handleUpdate = async () => {
    await updatePlan.mutateAsync({
      id: editId,
      payload: {
        name: editForm.name.trim(),
        pricePerMonth: Number(editForm.pricePerMonth),
        maxUsers: Number(editForm.maxUsers),
        maxProjects: Number(editForm.maxProjects),
        description: editForm.description.trim() || undefined,
        isPopular: editForm.isPopular,
        features: editForm.featureKeys,
      },
    });
    handleEditClose();
  };

  const handleDeleteConfirm = async () => {
    await deletePlan.mutateAsync(deleteId);
    setDeleteId('');
    setDeleteName('');
  };

  // Resolve feature keys → display names for the plan card
  const featureMap = Object.fromEntries((allFeatures as any[]).map((f: any) => [f.key, f]));
  const resolveFeatures = (keys: string[]) =>
    keys.map((k) => featureMap[k] ?? { key: k, name: k, description: null });

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        title="Subscription Plans"
        subtitle="Define pricing tiers and feature sets available to tenants."
        actions={
          <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New plan
          </AppButton>
        }
      />

      {(plans as any[]).length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          No plans yet. Create the first plan above.
        </Typography>
      ) : (
        <Box sx={{
          display: 'grid', gap: 2.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
        }}>
          {(plans as any[]).map((plan: any) => {
            const resolvedFeatures = resolveFeatures(plan.features ?? []);
            return (
              <Card key={plan._id} elevation={0} sx={{
                border: '1px solid',
                borderColor: plan.isPopular && plan.isActive !== false ? 'primary.main' : 'divider',
                borderRadius: 2, position: 'relative',
                opacity: plan.isActive === false ? 0.5 : 1,
              }}>
                <Box position="absolute" top={12} right={12} display="flex" gap={0.75}>
                  {plan.isActive === false && (
                    <Chip label="Inactive" size="small" color="default" sx={{ fontSize: '0.65rem' }} />
                  )}
                  {plan.isPopular && plan.isActive !== false && (
                    <Chip label="Most popular" color="primary" size="small"
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                  )}
                </Box>

                <CardContent sx={{ p: 3, pt: plan.isPopular || plan.isActive === false ? 5 : 3 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    {plan.tier ?? plan.name}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 0.5 }}>
                    ${plan.pricePerMonth}
                    <Typography component="span" variant="body2" color="text.secondary" ml={0.5}>/mo</Typography>
                  </Typography>
                  {plan.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {plan.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Up to {plan.maxUsers} users · {plan.maxProjects} projects
                  </Typography>

                  {resolvedFeatures.length > 0 && (
                    <List dense disablePadding sx={{ mt: 2 }}>
                      {resolvedFeatures.map((f: any, i: number) => (
                        <ListItem key={i} disableGutters sx={{ py: 0.25 }} alignItems="flex-start">
                          <ListItemIcon sx={{ minWidth: 28, mt: 0.25 }}>
                            <CheckIcon fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={f.name}
                            secondary={f.description || undefined}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}

                  <Stack direction="row" justifyContent="flex-end" gap={0.5} mt={2}>
                    <Tooltip title="Edit plan">
                      <IconButton size="small" onClick={() => handleEditOpen(plan)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete plan">
                      <IconButton size="small" color="error"
                        onClick={() => { setDeleteId(plan._id); setDeleteName(plan.name); }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Create ── */}
      <PlanDialog
        open={createOpen} title="New plan"
        form={createForm} tierLocked={false} saving={createPlan.isPending}
        allFeatures={allFeatures as any[]}
        onChange={setCreate}
        onFeatureKeys={(keys) => setCreateForm((prev) => ({ ...prev, featureKeys: keys }))}
        onClose={handleCreateClose} onSubmit={handleCreate}
      />

      {/* ── Edit ── */}
      <PlanDialog
        open={editOpen} title="Edit plan"
        form={editForm} tierLocked saving={updatePlan.isPending}
        allFeatures={allFeatures as any[]}
        onChange={setEdit}
        onFeatureKeys={(keys) => setEditForm((prev) => ({ ...prev, featureKeys: keys }))}
        onClose={handleEditClose} onSubmit={handleUpdate}
      />

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId('')} maxWidth="xs" fullWidth>
        <DialogTitle>Delete plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete <strong>{deleteName}</strong>?
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId('')}>Cancel</Button>
          <Button variant="contained" color="error"
            onClick={handleDeleteConfirm} disabled={deletePlan.isPending}>
            {deletePlan.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
