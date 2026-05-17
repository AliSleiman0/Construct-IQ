'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Avatar,
  IconButton,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PaletteIcon from '@mui/icons-material/Palette';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import CheckIcon from '@mui/icons-material/Check';
import UploadIcon from '@mui/icons-material/Upload';
import LinkIcon from '@mui/icons-material/Link';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import PublicIcon from '@mui/icons-material/Public';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import StraightenIcon from '@mui/icons-material/Straighten';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import LockOutlineIcon from '@mui/icons-material/LockOutlined';
import LockIcon from '@mui/icons-material/Lock';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { useOrgSettings } from '@/features/settings/hooks/useOrgSettings';
import { useUpdateOrgSettings } from '@/features/settings/hooks/useSettingsMutations';
import {
  useCurrentOrg,
  useUpdateOrganization,
  useUploadOrgLogo,
} from '@/features/organizations/hooks/useOrganizations';
import { useAuthStore } from '@/store/auth.store';

/* ------------------------------------------------------------------ */
/*  Types & defaults                                                   */
/* ------------------------------------------------------------------ */
interface NotifSettings {
  newProject: boolean;
  invoiceDue: boolean;
  invoicePaid: boolean;
  ticketUpdate: boolean;
  weeklyDigest: boolean;
  productNews: boolean;
  securityAlerts: boolean;
}

interface Settings {
  name: string;
  shortName: string;
  slug: string;
  industry: string;
  size: string;
  description: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  publicEmail: string;
  website: string;
  brandColor: string;
  theme: 'light' | 'dark' | 'auto';
  emailSender: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  weekStart: string;
  measurement: 'imperial' | 'metric';
  digest: 'daily' | 'weekly' | 'never';
  notif: NotifSettings;
  twoFactorRequired: boolean;
  passwordPolicy: 'standard' | 'strong' | 'strict';
  sessionTimeoutMin: number;
  lockoutMaxAttempts: number;
  lockoutDurationMin: number;
  /** Local form value: newline/comma-separated string the user types into a
   *  textarea. Normalized to `string[]` at save time. */
  allowedIpsText: string;
}

const DEFAULT_SETTINGS: Settings = {
  name: 'Company A Construction Group',
  shortName: 'Company A',
  slug: 'company-a',
  industry: 'General Contracting',
  size: '51\u2013200',
  description: 'Bay Area general contractor specializing in mixed-use and civic projects. Family-owned since 1987.',
  street: '450 Market Street, Suite 1800',
  city: 'San Francisco',
  state: 'CA',
  zip: '94105',
  country: 'United States',
  phone: '+1 (415) 555-0190',
  publicEmail: 'hello@company-a.com',
  website: 'https://www.company-a.com',
  brandColor: '#1976d2',
  theme: 'auto',
  emailSender: '',
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  dateFormat: 'MMM D, YYYY',
  weekStart: 'monday',
  measurement: 'imperial',
  digest: 'weekly',
  notif: {
    newProject: true,
    invoiceDue: true,
    invoicePaid: false,
    ticketUpdate: true,
    weeklyDigest: true,
    productNews: false,
    securityAlerts: true,
  },
  twoFactorRequired: true,
  passwordPolicy: 'strong',
  sessionTimeoutMin: 120,
  lockoutMaxAttempts: 5,
  lockoutDurationMin: 15,
  allowedIpsText: '',
};

const SECTIONS = [
  { id: 'profile', label: 'Organization profile', icon: BusinessIcon },
  { id: 'address', label: 'Address & contact', icon: LocationOnIcon },
  { id: 'branding', label: 'Branding', icon: PaletteIcon },
  { id: 'localization', label: 'Localization', icon: LanguageIcon },
  { id: 'notifications', label: 'Notifications', icon: NotificationsIcon },
  { id: 'security', label: 'Security', icon: SecurityIcon },
  { id: 'danger', label: 'Danger zone', icon: WarningIcon },
];

const INDUSTRIES = [
  'General Contracting', 'Civil Engineering', 'Architecture & Design',
  'Heavy Construction', 'Mechanical / Electrical / Plumbing',
  'Real Estate Development', 'Specialty Trade', 'Other',
];

const ORG_SIZES = ['1\u201310', '11\u201350', '51\u2013200', '201\u2013500', '500+'];

const BRAND_COLORS = [
  { name: 'Blue (default)', value: '#1976d2' },
  { name: 'Indigo', value: '#3f51b5' },
  { name: 'Teal', value: '#00897b' },
  { name: 'Green', value: '#2e7d32' },
  { name: 'Amber', value: '#f57c00' },
  { name: 'Deep Orange', value: '#e64a19' },
  { name: 'Slate', value: '#455a64' },
  { name: 'Plum', value: '#7b1fa2' },
];

/* ------------------------------------------------------------------ */
/*  Inline helper components                                           */
/* ------------------------------------------------------------------ */
function SettingsSection({ title, subtitle, children, danger }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: danger ? 'rgba(211,47,47,0.4)' : 'divider',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3.5, pt: 2.5, pb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={500} color={danger ? 'error.main' : 'text.primary'}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: 3.5, pt: 2, pb: 3 }}>{children}</Box>
    </Paper>
  );
}

function FieldGrid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2.5 }}>
      {children}
    </Box>
  );
}

function ToggleRow({ label, hint, checked, onChange, badge }: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={500}>{label}</Typography>
          {badge}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
          {hint}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(_, v) => onChange(v)} />
    </Box>
  );
}

function RadioCard({ value, current, onChange, title, hint, icon: Icon }: {
  value: string;
  current: string;
  onChange: (v: string) => void;
  title: string;
  hint: string;
  icon: React.ElementType;
}) {
  const selected = value === current;
  return (
    <Box
      onClick={() => onChange(value)}
      sx={{
        flex: 1,
        p: 1.75,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: selected ? 'rgba(25,118,210,0.04)' : 'background.paper',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background-color 0.12s',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: selected ? 'rgba(25,118,210,0.12)' : 'action.hover',
          color: selected ? 'primary.main' : 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500}>{title}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
          {hint}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: selected ? 'primary.main' : 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mt: 0.25,
          flexShrink: 0,
        }}
      >
        {selected && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />}
      </Box>
    </Box>
  );
}

function EnterpriseBadge() {
  return (
    <Chip
      icon={<WorkspacePremiumIcon sx={{ fontSize: 12 }} />}
      label="ENTERPRISE"
      size="small"
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        background: 'linear-gradient(135deg, #f57c00, #ffb300)',
        color: '#fff',
        '& .MuiChip-icon': { color: '#fff', ml: 0.5 },
      }}
    />
  );
}

function DangerRow({ title, description, actionLabel, onClick, icon: Icon, }: {
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  icon: React.ElementType;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
        p: 2,
        border: '1px solid',
        borderColor: 'rgba(211,47,47,0.25)',
        borderRadius: 1.5,
        mb: 1.25,
        '&:last-child': { mb: 0 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: 'error.lighter',
            background: '#fdecea',
            color: 'error.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={500}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            {description}
          </Typography>
        </Box>
      </Box>
      <Button variant="outlined" color="error" size="small" onClick={onClick} sx={{ flexShrink: 0 }}>
        {actionLabel}
      </Button>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
export default function AdminSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((st) => st.user);
  const { data: orgSettings } = useOrgSettings();
  const { data: orgDoc } = useCurrentOrg();
  const updateSettings = useUpdateOrgSettings();
  const updateOrg = useUpdateOrganization();
  const uploadLogo = useUploadOrgLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const initial = useMemo<Settings>(() => {
    const fallback = user?.organization;
    const org = orgDoc ?? fallback;
    const os = orgSettings;
    const notifs = (os?.notifications ?? {}) as Record<string, any>;
    return {
      ...DEFAULT_SETTINGS,
      name: org?.name ?? DEFAULT_SETTINGS.name,
      shortName: (org as any)?.shortName ?? DEFAULT_SETTINGS.shortName,
      slug: org?.slug ?? DEFAULT_SETTINGS.slug,
      industry: (org as any)?.industry ?? DEFAULT_SETTINGS.industry,
      size: (org as any)?.size ?? DEFAULT_SETTINGS.size,
      description: (org as any)?.description ?? DEFAULT_SETTINGS.description,
      street: (org as any)?.street ?? DEFAULT_SETTINGS.street,
      city: (org as any)?.city ?? DEFAULT_SETTINGS.city,
      state: (org as any)?.state ?? DEFAULT_SETTINGS.state,
      zip: (org as any)?.zip ?? DEFAULT_SETTINGS.zip,
      country: (org as any)?.country ?? DEFAULT_SETTINGS.country,
      phone: (org as any)?.phone ?? DEFAULT_SETTINGS.phone,
      publicEmail: (org as any)?.email ?? DEFAULT_SETTINGS.publicEmail,
      website: (org as any)?.website ?? DEFAULT_SETTINGS.website,
      brandColor: os?.brandColor ?? DEFAULT_SETTINGS.brandColor,
      theme: (os?.theme ?? DEFAULT_SETTINGS.theme) as 'light' | 'dark' | 'auto',
      emailSender: os?.emailSender ?? DEFAULT_SETTINGS.emailSender,
      timezone: os?.timezone ?? DEFAULT_SETTINGS.timezone,
      currency: os?.currency ?? DEFAULT_SETTINGS.currency,
      dateFormat: os?.dateFormat ?? DEFAULT_SETTINGS.dateFormat,
      weekStart: os?.weekStart ?? DEFAULT_SETTINGS.weekStart,
      measurement: (os?.measurement ?? DEFAULT_SETTINGS.measurement) as 'imperial' | 'metric',
      twoFactorRequired: os?.twoFactorRequired ?? DEFAULT_SETTINGS.twoFactorRequired,
      passwordPolicy: (os?.passwordPolicy ?? DEFAULT_SETTINGS.passwordPolicy) as 'standard' | 'strong' | 'strict',
      sessionTimeoutMin: os?.sessionTimeoutMin ?? DEFAULT_SETTINGS.sessionTimeoutMin,
      lockoutMaxAttempts: os?.lockoutMaxAttempts ?? DEFAULT_SETTINGS.lockoutMaxAttempts,
      lockoutDurationMin: os?.lockoutDurationMin ?? DEFAULT_SETTINGS.lockoutDurationMin,
      allowedIpsText: (os?.allowedIps ?? []).join('\n'),
      notif: {
        newProject: notifs.projectStatusChange ?? DEFAULT_SETTINGS.notif.newProject,
        invoiceDue: notifs.budgetAlert ?? DEFAULT_SETTINGS.notif.invoiceDue,
        invoicePaid: notifs.deliveryUpdate ?? DEFAULT_SETTINGS.notif.invoicePaid,
        ticketUpdate: notifs.newIssue ?? DEFAULT_SETTINGS.notif.ticketUpdate,
        weeklyDigest: notifs.emailDigest === 'weekly' || notifs.emailDigest === 'daily',
        productNews: notifs.newMember ?? DEFAULT_SETTINGS.notif.productNews,
        securityAlerts: notifs.poApproval ?? DEFAULT_SETTINGS.notif.securityAlerts,
      },
    };
  }, [user, orgSettings, orgDoc]);

  const [s, setS] = useState<Settings>(initial);
  useEffect(() => { setS(initial); }, [initial]);
  const [active, setActive] = useState('profile');
  const [transferModal, setTransferModal] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(initial), [s, initial]);

  const set = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));
  const setNotif = (key: keyof NotifSettings, val: boolean) =>
    setS((prev) => ({ ...prev, notif: { ...prev.notif, [key]: val } }));

  return (
    <Box sx={{ pb: dirty ? 10 : 0 }}>
      <PageHeader
        title="Settings"
        subtitle="Manage your organization profile, branding, notifications, and security policies."
      />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: '240px 1fr', alignItems: 'start' }}>
        {/* Subnav */}
        <Paper
          elevation={0}
          sx={{ position: 'sticky', top: 88, borderRadius: 2, border: '1px solid', borderColor: 'divider', py: 1 }}
        >
          {SECTIONS.map((sec) => {
            const isActive = active === sec.id;
            const isDanger = sec.id === 'danger';
            const Icon = sec.icon;
            return (
              <Box
                key={sec.id}
                component="button"
                onClick={() => setActive(sec.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  width: '100%',
                  textAlign: 'left',
                  px: 2,
                  py: 1.25,
                  border: 'none',
                  borderLeft: '3px solid',
                  borderLeftColor: isActive ? (isDanger ? 'error.main' : 'primary.main') : 'transparent',
                  bgcolor: isActive ? (isDanger ? 'rgba(211,47,47,0.08)' : 'rgba(25,118,210,0.08)') : 'transparent',
                  color: isActive ? (isDanger ? 'error.main' : 'primary.main') : 'text.primary',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: isActive ? undefined : 'action.hover' },
                }}
              >
                <Icon sx={{ fontSize: 18 }} />
                <span>{sec.label}</span>
              </Box>
            );
          })}
        </Paper>

        {/* Content */}
        <Box sx={{ minWidth: 0 }}>
          {active === 'profile' && (
            <SettingsSection title="Organization profile" subtitle="Basic information about your organization. Visible to members and clients.">
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={orgDoc?.logoUrl ?? user?.organization.logoUrl ?? undefined}
                    sx={{
                      width: 96,
                      height: 96,
                      borderRadius: 4,
                      background: orgDoc?.logoUrl
                        ? undefined
                        : `linear-gradient(135deg, ${s.brandColor}, ${s.brandColor}aa)`,
                      fontSize: 36,
                      fontWeight: 600,
                      letterSpacing: 1,
                    }}
                  >
                    {(s.shortName || s.name).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </Avatar>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file || !orgDoc) return;
                      if (file.size > 2 * 1024 * 1024) {
                        enqueueSnackbar('Logo must be 2 MB or smaller.', { variant: 'error' });
                        return;
                      }
                      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                        enqueueSnackbar('Logo must be PNG, JPEG, or WebP.', { variant: 'error' });
                        return;
                      }
                      uploadLogo.mutate({ id: orgDoc.id, file });
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<UploadIcon />}
                    disabled={!orgDoc || uploadLogo.isPending}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadLogo.isPending ? 'Uploading…' : 'Upload logo'}
                  </Button>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    PNG, JPEG, or WebP &middot; max 2 MB
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <FieldGrid>
                    <TextField
                      label="Legal name"
                      size="small"
                      fullWidth
                      value={s.name}
                      onChange={(e) => set({ name: e.target.value })}
                    />
                    <TextField
                      label="Display name"
                      size="small"
                      fullWidth
                      value={s.shortName}
                      onChange={(e) => set({ shortName: e.target.value })}
                      helperText="Shown in the sidebar and emails."
                    />
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <TextField
                        label="URL slug"
                        size="small"
                        fullWidth
                        value={s.slug}
                        onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        InputProps={{ startAdornment: <LinkIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }}
                        helperText={`https://app.constructiq.com/${s.slug}`}
                      />
                    </Box>
                    <TextField
                      label="Industry"
                      size="small"
                      fullWidth
                      select
                      value={s.industry}
                      onChange={(e) => set({ industry: e.target.value })}
                    >
                      {INDUSTRIES.map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                    </TextField>
                    <TextField
                      label="Organization size"
                      size="small"
                      fullWidth
                      select
                      value={s.size}
                      onChange={(e) => set({ size: e.target.value })}
                    >
                      {ORG_SIZES.map((i) => <MenuItem key={i} value={i}>{i} employees</MenuItem>)}
                    </TextField>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <TextField
                        label="About"
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                        value={s.description}
                        onChange={(e) => set({ description: e.target.value })}
                        helperText="A short description shown on shared project pages."
                      />
                    </Box>
                  </FieldGrid>
                </Box>
              </Box>
            </SettingsSection>
          )}

          {active === 'address' && (
            <SettingsSection title="Address & contact" subtitle="Used on invoices and shared with project clients.">
              <FieldGrid>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField label="Street address" size="small" fullWidth value={s.street} onChange={(e) => set({ street: e.target.value })} />
                </Box>
                <TextField label="City" size="small" fullWidth value={s.city} onChange={(e) => set({ city: e.target.value })} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                  <TextField label="State / Region" size="small" fullWidth value={s.state} onChange={(e) => set({ state: e.target.value })} />
                  <TextField label="ZIP / Postal" size="small" fullWidth value={s.zip} onChange={(e) => set({ zip: e.target.value })} />
                </Box>
                <TextField label="Country" size="small" fullWidth select value={s.country} onChange={(e) => set({ country: e.target.value })}>
                  {['United States', 'Canada', 'Mexico', 'United Kingdom', 'Australia', 'Germany'].map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Phone"
                  size="small"
                  fullWidth
                  value={s.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  InputProps={{ startAdornment: <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }}
                />
                <TextField
                  label="Public email"
                  size="small"
                  fullWidth
                  value={s.publicEmail}
                  onChange={(e) => set({ publicEmail: e.target.value })}
                  InputProps={{ startAdornment: <MailIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }}
                />
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField
                    label="Website"
                    size="small"
                    fullWidth
                    value={s.website}
                    onChange={(e) => set({ website: e.target.value })}
                    InputProps={{ startAdornment: <PublicIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} /> }}
                  />
                </Box>
              </FieldGrid>
            </SettingsSection>
          )}

          {active === 'branding' && (
            <>
              <SettingsSection title="Brand color" subtitle="Used in headers, links, and exported documents.">
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1.5, mb: 2 }}>
                  {BRAND_COLORS.map((c) => {
                    const selected = s.brandColor === c.value;
                    return (
                      <Box
                        key={c.value}
                        component="button"
                        onClick={() => set({ brandColor: c.value })}
                        title={c.name}
                        sx={{
                          aspectRatio: '1 / 1',
                          borderRadius: 3,
                          bgcolor: c.value,
                          border: '3px solid',
                          borderColor: selected ? 'text.primary' : 'transparent',
                          cursor: 'pointer',
                          position: 'relative',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                          transition: 'transform 0.12s',
                          '&:hover': { transform: 'scale(1.05)' },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {selected && <CheckIcon sx={{ color: '#fff', fontSize: 28, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />}
                      </Box>
                    );
                  })}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Custom hex codes available on the Enterprise plan.
                </Typography>
              </SettingsSection>

              <SettingsSection title="Appearance" subtitle="Default theme for new members. Each member can override their own preference.">
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <RadioCard value="light" current={s.theme} onChange={(v) => set({ theme: v as Settings['theme'] })} title="Light" hint="High contrast white surfaces" icon={LightModeIcon} />
                  <RadioCard value="dark" current={s.theme} onChange={(v) => set({ theme: v as Settings['theme'] })} title="Dark" hint="Easier on the eyes after hours" icon={DarkModeIcon} />
                  <RadioCard value="auto" current={s.theme} onChange={(v) => set({ theme: v as Settings['theme'] })} title="System" hint="Follows the user\u2019s OS setting" icon={BrightnessAutoIcon} />
                </Box>
              </SettingsSection>

              <SettingsSection title="Email customization" subtitle="How outbound emails from ConstructIQ appear to recipients.">
                <Box sx={{ gridColumn: '1 / -1', mb: 2 }}>
                  <TextField
                    label="Sender display name"
                    size="small"
                    fullWidth
                    value={s.emailSender}
                    onChange={(e) => set({ emailSender: e.target.value })}
                    helperText="Appears in the From field of all platform emails."
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AlternateEmailIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Custom sending domain</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Send emails from @company-a.com instead of @constructiq.com
                      </Typography>
                    </Box>
                  </Box>
                  <EnterpriseBadge />
                </Box>
              </SettingsSection>
            </>
          )}

          {active === 'localization' && (
            <SettingsSection title="Localization" subtitle="Default formats and units for the organization.">
              <FieldGrid>
                <TextField label="Timezone" size="small" fullWidth select value={s.timezone} onChange={(e) => set({ timezone: e.target.value })}>
                  {[
                    { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time \u2014 Los Angeles' },
                    { value: 'America/Denver', label: '(GMT-07:00) Mountain Time \u2014 Denver' },
                    { value: 'America/Chicago', label: '(GMT-06:00) Central Time \u2014 Chicago' },
                    { value: 'America/New_York', label: '(GMT-05:00) Eastern Time \u2014 New York' },
                    { value: 'Europe/London', label: '(GMT+00:00) London' },
                    { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin' },
                  ].map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
                <TextField label="Currency" size="small" fullWidth select value={s.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {[
                    { value: 'USD', label: 'US Dollar ($)' },
                    { value: 'CAD', label: 'Canadian Dollar (C$)' },
                    { value: 'EUR', label: 'Euro (\u20AC)' },
                    { value: 'GBP', label: 'British Pound (\u00A3)' },
                    { value: 'AUD', label: 'Australian Dollar (A$)' },
                  ].map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
                <TextField label="Date format" size="small" fullWidth select value={s.dateFormat} onChange={(e) => set({ dateFormat: e.target.value })}>
                  {[
                    { value: 'MMM D, YYYY', label: 'MMM D, YYYY \u2014 Jan 15, 2026' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY \u2014 01/15/2026' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY \u2014 15/01/2026' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD \u2014 2026-01-15' },
                  ].map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
                <TextField label="Week starts on" size="small" fullWidth select value={s.weekStart} onChange={(e) => set({ weekStart: e.target.value })}>
                  <MenuItem value="sunday">Sunday</MenuItem>
                  <MenuItem value="monday">Monday</MenuItem>
                </TextField>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 1, display: 'block', letterSpacing: 0.2 }}>
                    Units of measurement
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <RadioCard value="imperial" current={s.measurement} onChange={(v) => set({ measurement: v as 'imperial' | 'metric' })} title="Imperial" hint="feet, inches, pounds, \u00B0F" icon={StraightenIcon} />
                    <RadioCard value="metric" current={s.measurement} onChange={(v) => set({ measurement: v as 'imperial' | 'metric' })} title="Metric" hint="meters, kilograms, \u00B0C" icon={SquareFootIcon} />
                  </Box>
                </Box>
              </FieldGrid>
            </SettingsSection>
          )}

          {active === 'notifications' && (
            <>
              <SettingsSection title="Email digest" subtitle="How often you receive a summary of org-wide activity.">
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <RadioCard value="daily" current={s.digest} onChange={(v) => set({ digest: v as Settings['digest'] })} title="Daily" hint="Sent at 8:00 AM in your timezone" icon={TodayIcon} />
                  <RadioCard value="weekly" current={s.digest} onChange={(v) => set({ digest: v as Settings['digest'] })} title="Weekly" hint="Sent Monday morning" icon={DateRangeIcon} />
                  <RadioCard value="never" current={s.digest} onChange={(v) => set({ digest: v as Settings['digest'] })} title="Never" hint="No periodic summaries" icon={NotificationsOffIcon} />
                </Box>
              </SettingsSection>

              <SettingsSection title="Event notifications" subtitle="Email notifications sent to you personally.">
                <ToggleRow label="New project created" hint="When a Project Manager creates a new project in Company A" checked={s.notif.newProject} onChange={(v) => setNotif('newProject', v)} />
                <ToggleRow label="Invoice due soon" hint="Three days before an invoice is due" checked={s.notif.invoiceDue} onChange={(v) => setNotif('invoiceDue', v)} />
                <ToggleRow label="Invoice paid" hint="When an invoice is successfully charged" checked={s.notif.invoicePaid} onChange={(v) => setNotif('invoicePaid', v)} />
                <ToggleRow label="Support ticket updates" hint="When a ticket you reported gets a new reply" checked={s.notif.ticketUpdate} onChange={(v) => setNotif('ticketUpdate', v)} />
                <ToggleRow
                  label="Security alerts"
                  hint="Unusual sign-in activity, password resets, SSO changes"
                  checked={s.notif.securityAlerts}
                  onChange={(v) => setNotif('securityAlerts', v)}
                  badge={<Chip label="Recommended" color="success" size="small" sx={{ height: 20, fontSize: 11 }} />}
                />
                <ToggleRow label="Product news" hint="Major releases, new features, and platform updates" checked={s.notif.productNews} onChange={(v) => setNotif('productNews', v)} />
              </SettingsSection>
            </>
          )}

          {active === 'security' && (
            <>
              <SettingsSection title="Authentication">
                <ToggleRow
                  label="Require two-factor authentication"
                  hint="All members must enable 2FA before they can access Company A"
                  checked={s.twoFactorRequired}
                  onChange={(v) => set({ twoFactorRequired: v })}
                  badge={<Chip label="Recommended" color="success" size="small" sx={{ height: 20, fontSize: 11 }} />}
                />

                <Box sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" fontWeight={500}>Password policy</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 1.5 }}>
                    Minimum complexity for member passwords
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <RadioCard value="standard" current={s.passwordPolicy} onChange={(v) => set({ passwordPolicy: v as Settings['passwordPolicy'] })} title="Standard" hint="8+ chars, upper, lower, digit" icon={LockOutlineIcon} />
                    <RadioCard value="strong" current={s.passwordPolicy} onChange={(v) => set({ passwordPolicy: v as Settings['passwordPolicy'] })} title="Strong" hint="12+ chars, plus a special character" icon={LockIcon} />
                    <RadioCard value="strict" current={s.passwordPolicy} onChange={(v) => set({ passwordPolicy: v as Settings['passwordPolicy'] })} title="Strict" hint="14+ chars, plus no whitespace" icon={SecurityIcon} />
                  </Box>
                </Box>

                <Box sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Session timeout</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      Access tokens expire after this much time. Applies to new logins.
                    </Typography>
                  </Box>
                  <TextField
                    size="small"
                    select
                    value={s.sessionTimeoutMin}
                    onChange={(e) => set({ sessionTimeoutMin: Number(e.target.value) })}
                    sx={{ width: 200 }}
                  >
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={120}>2 hours</MenuItem>
                    <MenuItem value={480}>8 hours</MenuItem>
                    <MenuItem value={1440}>24 hours</MenuItem>
                  </TextField>
                </Box>
              </SettingsSection>

              <SettingsSection title="Account lockout" subtitle="Block sign-in after repeated failures to defend against brute-force attacks.">
                <FieldGrid>
                  <TextField
                    label="Max failed attempts"
                    type="number"
                    size="small"
                    fullWidth
                    value={s.lockoutMaxAttempts}
                    onChange={(e) =>
                      set({ lockoutMaxAttempts: Number(e.target.value) || 0 })
                    }
                    inputProps={{ min: 3, max: 20 }}
                    helperText="Between 3 and 20"
                  />
                  <TextField
                    label="Lockout duration (minutes)"
                    type="number"
                    size="small"
                    fullWidth
                    value={s.lockoutDurationMin}
                    onChange={(e) =>
                      set({ lockoutDurationMin: Number(e.target.value) || 0 })
                    }
                    inputProps={{ min: 1, max: 1440 }}
                    helperText="Between 1 and 1440 minutes"
                  />
                </FieldGrid>
              </SettingsSection>

              <SettingsSection title="IP allowlist" subtitle="Restrict platform access to specific networks. Leave empty to allow all. Super Admins are never blocked.">
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  size="small"
                  value={s.allowedIpsText}
                  onChange={(e) => set({ allowedIpsText: e.target.value })}
                  placeholder={'e.g.\n10.0.0.0/8\n192.168.1.42\n2001:db8::/32'}
                  helperText="One entry per line or comma-separated. IPv4, IPv6, and CIDR ranges supported."
                />
              </SettingsSection>
            </>
          )}

          {active === 'danger' && (
            <SettingsSection title="Danger zone" subtitle="These actions affect every member of Company A and most cannot be undone. Proceed with care." danger>
              <DangerRow
                title="Transfer ownership"
                description="Hand over Org Admin to another member. You\u2019ll be downgraded to Project Manager."
                actionLabel="Transfer ownership"
                onClick={() => setTransferModal(true)}
                icon={SwapHorizIcon}
              />
              <DangerRow
                title="Deactivate organization"
                description="Pause Company A. Members lose access, billing pauses next cycle. Reactivate within 30 days."
                actionLabel="Deactivate"
                onClick={() => setDeactivateModal(true)}
                icon={PauseCircleIcon}
              />
              <DangerRow
                title="Delete organization"
                description="Permanently remove Company A and all of its data after a 14-day grace period. This cannot be undone."
                actionLabel="Delete organization"
                onClick={() => setDeleteModal(true)}
                icon={DeleteForeverIcon}
              />
            </SettingsSection>
          )}
        </Box>
      </Box>

      {/* Unsaved changes bar */}
      {dirty && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 260,
            right: 0,
            bgcolor: '#1a1a2e',
            color: '#fff',
            px: 3,
            py: 1.75,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.18)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <InfoIcon sx={{ fontSize: 20, color: '#ffb74d' }} />
            <Typography variant="body2">You have unsaved changes.</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setS(initial)}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'rgba(255,255,255,0.5)' } }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={updateOrg.isPending || updateSettings.isPending}
              onClick={async () => {
                if (!orgDoc) {
                  enqueueSnackbar('Organization not loaded yet.', { variant: 'error' });
                  return;
                }
                const orgPayload = {
                  name: s.name,
                  slug: s.slug,
                  shortName: s.shortName || null,
                  industry: s.industry || null,
                  size: s.size || null,
                  description: s.description || null,
                  street: s.street || null,
                  city: s.city || null,
                  state: s.state || null,
                  zip: s.zip || null,
                  country: s.country || null,
                  phone: s.phone || null,
                  email: s.publicEmail || null,
                  website: s.website || null,
                };
                const settingsPayload = {
                  brandColor: s.brandColor,
                  theme: s.theme,
                  emailSender: s.emailSender || null,
                  timezone: s.timezone,
                  currency: s.currency,
                  dateFormat: s.dateFormat,
                  weekStart: s.weekStart,
                  measurement: s.measurement,
                  twoFactorRequired: s.twoFactorRequired,
                  passwordPolicy: s.passwordPolicy,
                  sessionTimeoutMin: s.sessionTimeoutMin,
                  lockoutMaxAttempts: s.lockoutMaxAttempts,
                  lockoutDurationMin: s.lockoutDurationMin,
                  allowedIps: Array.from(
                    new Set(
                      s.allowedIpsText
                        .split(/[\s,]+/)
                        .map((entry) => entry.trim())
                        .filter((entry) => entry.length > 0),
                    ),
                  ),
                  notifications: {
                    projectStatusChange: s.notif.newProject,
                    budgetAlert: s.notif.invoiceDue,
                    deliveryUpdate: s.notif.invoicePaid,
                    newIssue: s.notif.ticketUpdate,
                    emailDigest: s.notif.weeklyDigest ? 'weekly' : 'never',
                    newMember: s.notif.productNews,
                    poApproval: s.notif.securityAlerts,
                  },
                };
                const results = await Promise.allSettled([
                  updateOrg.mutateAsync({ id: orgDoc.id, payload: orgPayload }),
                  updateSettings.mutateAsync(settingsPayload),
                ]);
                const failures = results.filter(
                  (r): r is PromiseRejectedResult => r.status === 'rejected',
                );
                if (failures.length === 0) {
                  enqueueSnackbar('Settings saved.', { variant: 'success' });
                } else {
                  const msg = failures
                    .map((f) => {
                      const raw = (f.reason as any)?.response?.data?.message;
                      return Array.isArray(raw) ? raw.join(', ') : raw ?? 'Save failed.';
                    })
                    .join(' ');
                  enqueueSnackbar(msg, { variant: 'error' });
                }
              }}
            >
              Save changes
            </Button>
          </Box>
        </Box>
      )}

      {/* Transfer ownership modal */}
      <Dialog open={transferModal} onClose={() => setTransferModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer organization ownership</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The new owner will receive an email to accept ownership. You&apos;ll be downgraded to <strong>Project Manager</strong> automatically once they accept.
          </Typography>
          <TextField label="New owner&apos;s email" size="small" fullWidth placeholder="name@company-a.com" sx={{ mb: 2 }} />
          <TextField label="Note (optional)" size="small" fullWidth multiline rows={3} placeholder="Add any context for the new owner\u2026" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setTransferModal(false);
              enqueueSnackbar('Transfer request sent for review.', { variant: 'success' });
            }}
          >
            Send request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate modal */}
      <Dialog open={deactivateModal} onClose={() => setDeactivateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate organization?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Your organization will be archived. Members will lose access immediately. Billing will pause at the end of the current cycle. You can reactivate within 30 days.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setDeactivateModal(false);
              enqueueSnackbar('Deactivation flow is not available in this demo.', { variant: 'error' });
            }}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete modal */}
      <Dialog open={deleteModal} onClose={() => setDeleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Permanently delete Company A?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>This action cannot be undone.</strong> All projects (6), users (10), invoices, tickets, and documents will be permanently deleted after a 14-day grace period.
          </Alert>
          <TextField
            label='Type "company-a" to confirm'
            size="small"
            fullWidth
            placeholder="company-a"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteModal(false); setDeleteConfirm(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteConfirm !== 'company-a'}
            onClick={() => {
              setDeleteModal(false);
              setDeleteConfirm('');
              enqueueSnackbar('Deletion is not available in this demo.', { variant: 'error' });
            }}
          >
            I understand, delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
