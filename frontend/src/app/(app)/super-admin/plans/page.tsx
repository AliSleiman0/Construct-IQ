'use client';

import {
  Box, Card, CardContent, Typography, List, ListItem, ListItemIcon,
  ListItemText, Chip, CircularProgress, IconButton, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, MenuItem, Switch, FormControlLabel, Divider, InputAdornment,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import {
  usePlans, useCreatePlan, useUpdatePlan, useDeletePlan,
} from '@/features/plans/hooks/usePlans';
import { useState, KeyboardEvent } from 'react';

const TIERS = ['STARTER', 'PRO', 'ENTERPRISE'];

interface PlanForm {
  name: string;
  tier: string;
  pricePerMonth: string;
  maxUsers: string;
  maxProjects: string;
  description: string;
  isPopular: boolean;
  features: string[];
}

const EMPTY_FORM: PlanForm = {
  name: '', tier: 'STARTER', pricePerMonth: '', maxUsers: '',
  maxProjects: '', description: '', isPopular: false, features: [],
};

// ── Feature list editor ───────────────────────────────────────────────────────
function FeatureEditor({
  features, onChange,
}: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || features.includes(trimmed)) return;
    onChange([...features, trimmed]);
    setInput('');
  };

  const remove = (i: number) => onChange(features.filter((_, idx) => idx !== i));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Features
      </Typography>
      <Stack gap={0.75} mt={0.75} mb={1.5}>
        {features.length === 0 ? (
          <Typography variant="caption" color="text.disabled">No features added yet.</Typography>
        ) : (
          features.map((f, i) => (
            <Box key={i} display="flex" alignItems="center" gap={1}
              sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <CheckIcon sx={{ fontSize: 14, color: 'success.main', flexShrink: 0 }} />
              <Typography variant="body2" flex={1}>{f}</Typography>
              <IconButton size="small" onClick={() => remove(i)} sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))
        )}
      </Stack>
      <Stack direction="row" gap={1}>
        <TextField
          size="small" fullWidth
          placeholder="e.g. Unlimited storage"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <Button variant="outlined" size="small" onClick={add}
          disabled={!input.trim()} sx={{ whiteSpace: 'nowrap' }}>
          Add
        </Button>
      </Stack>
    </Box>
  );
}

// ── Shared create/edit dialog ─────────────────────────────────────────────────
function PlanDialog({
  open, title, form, tierLocked, saving,
  onChange, onFeatures, onClose, onSubmit,
}: {
  open: boolean;
  title: string;
  form: PlanForm;
  tierLocked: boolean;
  saving: boolean;
  onChange: (k: keyof PlanForm, v: any) => void;
  onFeatures: (f: string[]) => void;
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
          <FeatureEditor features={form.features} onChange={onFeatures} />
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
      features: createForm.features,
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
      features: Array.isArray(plan.features) ? [...plan.features] : [],
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
        features: editForm.features,
      },
    });
    handleEditClose();
  };

  const handleDeleteConfirm = async () => {
    await deletePlan.mutateAsync(deleteId);
    setDeleteId('');
    setDeleteName('');
  };

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
          {(plans as any[]).map((plan: any) => (
            <Card key={plan._id} elevation={0} sx={{
              border: '1px solid',
              borderColor: plan.isPopular && plan.isActive !== false ? 'primary.main' : 'divider',
              borderRadius: 2,
              position: 'relative',
              opacity: plan.isActive === false ? 0.5 : 1,
            }}>
              {/* top-right badges */}
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

                {(plan.features ?? []).length > 0 && (
                  <List dense disablePadding sx={{ mt: 2 }}>
                    {(plan.features as string[]).map((f, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2' }} />
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
                  {plan.isActive !== false && (
                    <Tooltip title="Deactivate plan">
                      <IconButton size="small" color="error"
                        onClick={() => { setDeleteId(plan._id); setDeleteName(plan.name); }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Create ── */}
      <PlanDialog
        open={createOpen} title="New plan"
        form={createForm} tierLocked={false} saving={createPlan.isPending}
        onChange={setCreate}
        onFeatures={(f) => setCreateForm((prev) => ({ ...prev, features: f }))}
        onClose={handleCreateClose} onSubmit={handleCreate}
      />

      {/* ── Edit ── */}
      <PlanDialog
        open={editOpen} title="Edit plan"
        form={editForm} tierLocked saving={updatePlan.isPending}
        onChange={setEdit}
        onFeatures={(f) => setEditForm((prev) => ({ ...prev, features: f }))}
        onClose={handleEditClose} onSubmit={handleUpdate}
      />

      {/* ── Deactivate confirm ── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId('')} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate <strong>{deleteName}</strong>?
            Existing subscribers keep their access but no new orgs can subscribe to this plan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId('')}>Cancel</Button>
          <Button variant="contained" color="error"
            onClick={handleDeleteConfirm} disabled={deletePlan.isPending}>
            {deletePlan.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
