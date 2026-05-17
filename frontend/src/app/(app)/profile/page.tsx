'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import StraightenIcon from '@mui/icons-material/Straighten';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS } from '@/config/roles';
import { useMe } from '@/features/users/hooks/useMe';
import { useUpdateMe } from '@/features/users/hooks/useUpdateMe';
import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_USER_LOCALIZATION,
  LANGUAGE_OPTIONS,
  MEASUREMENT_OPTIONS,
  TIMEZONE_OPTIONS,
  TIME_FORMAT_OPTIONS,
  WEEK_START_OPTIONS,
  resolveTimezone,
} from '@/constants/localization';
import {
  DEFAULT_USER_NOTIFICATIONS,
  DIGEST_OPTIONS,
  EVENT_TOGGLES,
} from '@/constants/notifications';
import type {
  DigestCadence,
  MeasurementSystem,
  TimeFormat,
  UserLocalization,
  UserNotificationPreferences,
} from '@/types/user.types';

/* ------------------------------------------------------------------ */
/*  Inline helpers (kept local — see plan notes)                       */
/* ------------------------------------------------------------------ */
function ProfileSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3.5, pt: 2.5, pb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={500}>
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

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5 }}>
      {children}
    </Box>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
          {hint}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(_, v) => onChange(v)} />
    </Box>
  );
}

function RadioCard({
  value,
  current,
  onChange,
  title,
  hint,
  icon: Icon,
}: {
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
        <Typography variant="body2" fontWeight={500}>
          {title}
        </Typography>
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
        {selected && (
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
        )}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: 'personal', label: 'Personal info', icon: PersonIcon },
  { id: 'localization', label: 'Localization', icon: LanguageIcon },
  { id: 'notifications', label: 'Notifications', icon: NotificationsIcon },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const { enqueueSnackbar } = useSnackbar();
  const authUser = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const setAuthUser = useAuthStore((s) => s.setUser);

  const { data: me } = useMe();
  const updateMe = useUpdateMe();

  const [active, setActive] = useState<TabId>('personal');

  // ── Personal info form state (in-memory only for this PR) ────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!authUser) return;
    setFirstName(authUser.firstName);
    setLastName(authUser.lastName);
    setPhone(authUser.phone ?? '');
  }, [authUser]);

  // ── Localization form state (server-backed) ──────────────────────────
  const initialLocalization = useMemo<UserLocalization>(() => {
    return { ...DEFAULT_USER_LOCALIZATION, ...(me?.localization ?? {}) };
  }, [me]);

  const [loc, setLoc] = useState<UserLocalization>(initialLocalization);
  useEffect(() => {
    setLoc(initialLocalization);
  }, [initialLocalization]);

  const locDirty = useMemo(
    () => JSON.stringify(loc) !== JSON.stringify(initialLocalization),
    [loc, initialLocalization],
  );

  const updateLoc = (patch: Partial<UserLocalization>) =>
    setLoc((prev) => ({ ...prev, ...patch }));

  // ── Notifications form state (server-backed) ─────────────────────────
  const initialNotifications = useMemo<UserNotificationPreferences>(() => {
    return { ...DEFAULT_USER_NOTIFICATIONS, ...(me?.notifications ?? {}) };
  }, [me]);

  const [notif, setNotif] = useState<UserNotificationPreferences>(initialNotifications);
  useEffect(() => {
    setNotif(initialNotifications);
  }, [initialNotifications]);

  const notifDirty = useMemo(
    () => JSON.stringify(notif) !== JSON.stringify(initialNotifications),
    [notif, initialNotifications],
  );

  const updateNotif = (patch: Partial<UserNotificationPreferences>) =>
    setNotif((prev) => ({ ...prev, ...patch }));

  if (!authUser) return null;

  // ── Handlers ─────────────────────────────────────────────────────────
  // TODO: switch Personal info save to `useUpdateMe()` once the endpoint
  // accepts firstName/lastName/phone. For now this only updates the auth
  // store in-memory so the rest of the app reflects the change.
  const handlePersonalSave = () => {
    setAuthUser({
      ...authUser,
      firstName: firstName.trim() || authUser.firstName,
      lastName: lastName.trim() || authUser.lastName,
      phone: phone.trim() || null,
    });
    enqueueSnackbar('Profile updated.', { variant: 'success' });
  };

  const handlePersonalReset = () => {
    setFirstName(authUser.firstName);
    setLastName(authUser.lastName);
    setPhone(authUser.phone ?? '');
  };

  const handleLocalizationSave = () => {
    updateMe.mutate(
      { localization: loc },
      {
        onSuccess: () => {
          enqueueSnackbar('Localization preferences saved.', { variant: 'success' });
        },
        onError: () => {
          enqueueSnackbar('Failed to save localization preferences.', {
            variant: 'error',
          });
        },
      },
    );
  };

  const handleLocalizationResetToDefaults = () => {
    updateMe.mutate(
      { localization: DEFAULT_USER_LOCALIZATION },
      {
        onSuccess: () => {
          setLoc(DEFAULT_USER_LOCALIZATION);
          enqueueSnackbar('Localization reset to defaults.', { variant: 'success' });
        },
        onError: () => {
          enqueueSnackbar('Failed to reset localization preferences.', {
            variant: 'error',
          });
        },
      },
    );
  };

  const handleNotificationsSave = () => {
    updateMe.mutate(
      { notifications: notif },
      {
        onSuccess: () => {
          enqueueSnackbar('Notification preferences saved.', { variant: 'success' });
        },
        onError: () => {
          enqueueSnackbar('Failed to save notification preferences.', {
            variant: 'error',
          });
        },
      },
    );
  };

  const handleNotificationsResetToDefaults = () => {
    updateMe.mutate(
      { notifications: DEFAULT_USER_NOTIFICATIONS },
      {
        onSuccess: () => {
          setNotif(DEFAULT_USER_NOTIFICATIONS);
          enqueueSnackbar('Notification preferences reset to defaults.', {
            variant: 'success',
          });
        },
        onError: () => {
          enqueueSnackbar('Failed to reset notification preferences.', {
            variant: 'error',
          });
        },
      },
    );
  };

  const resolvedTz = resolveTimezone(loc.timezone);
  const footerVisible =
    (active === 'localization' && locDirty) ||
    (active === 'notifications' && notifDirty);

  return (
    <Box sx={{ pb: footerVisible ? 10 : 0 }}>
      <PageHeader title="Profile" subtitle="Your personal info, avatar, and preferences." />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: '240px 1fr', alignItems: 'start' }}>
        {/* Subnav */}
        <Paper
          elevation={0}
          sx={{
            position: 'sticky',
            top: 88,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            py: 1,
          }}
        >
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            const Icon = tab.icon;
            return (
              <Box
                key={tab.id}
                component="button"
                onClick={() => setActive(tab.id)}
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
                  borderLeftColor: isActive ? 'primary.main' : 'transparent',
                  bgcolor: isActive ? 'rgba(25,118,210,0.08)' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.primary',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: isActive ? undefined : 'action.hover' },
                }}
              >
                <Icon sx={{ fontSize: 18 }} />
                <span>{tab.label}</span>
              </Box>
            );
          })}
        </Paper>

        {/* Content */}
        <Box sx={{ minWidth: 0 }}>
          {active === 'personal' && (
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                }}
              >
                <Avatar
                  src={authUser.avatarUrl ?? undefined}
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
                  {authUser.firstName[0]}
                  {authUser.lastName[0]}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>
                  {authUser.firstName} {authUser.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" mb={2}>
                  {authUser.email}
                </Typography>
                {role && (
                  <Chip
                    label={ROLE_LABELS[role]}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
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

              <Paper
                elevation={0}
                sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
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
                  <TextField
                    label="Email"
                    value={authUser.email}
                    fullWidth
                    disabled
                    helperText="Contact support to change your email."
                  />
                  <TextField
                    label="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    placeholder="+1-555-0000"
                  />
                  <TextField
                    label="Organization"
                    value={authUser.organization.name}
                    fullWidth
                    disabled
                  />
                </Stack>

                <Box mt={3} display="flex" justifyContent="flex-end" gap={1.5}>
                  <Button variant="text" onClick={handlePersonalReset}>
                    Reset
                  </Button>
                  <Button variant="contained" onClick={handlePersonalSave}>
                    Save changes
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {active === 'localization' && (
            <>
              <ProfileSection
                title="Localization"
                subtitle="How dates, times, and units appear for you across the app. Your preferences override the organization's defaults."
              >
                <FieldGrid>
                  <TextField
                    label="Language"
                    size="small"
                    fullWidth
                    select
                    value={loc.language}
                    onChange={(e) => updateLoc({ language: e.target.value as UserLocalization['language'] })}
                  >
                    {LANGUAGE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Timezone"
                    size="small"
                    fullWidth
                    select
                    value={loc.timezone}
                    onChange={(e) => updateLoc({ timezone: e.target.value })}
                    helperText={
                      loc.timezone === 'auto'
                        ? `Auto-detected: ${resolvedTz}`
                        : undefined
                    }
                  >
                    {TIMEZONE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Date format"
                    size="small"
                    fullWidth
                    select
                    value={loc.dateFormat}
                    onChange={(e) =>
                      updateLoc({ dateFormat: e.target.value as UserLocalization['dateFormat'] })
                    }
                  >
                    {DATE_FORMAT_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Week starts on"
                    size="small"
                    fullWidth
                    select
                    value={loc.firstDayOfWeek}
                    onChange={(e) =>
                      updateLoc({
                        firstDayOfWeek: e.target.value as UserLocalization['firstDayOfWeek'],
                      })
                    }
                  >
                    {WEEK_START_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography
                      variant="caption"
                      fontWeight={500}
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block', letterSpacing: 0.2 }}
                    >
                      Time format
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      {TIME_FORMAT_OPTIONS.map((o) => (
                        <RadioCard
                          key={o.value}
                          value={o.value}
                          current={loc.timeFormat}
                          onChange={(v) => updateLoc({ timeFormat: v as TimeFormat })}
                          title={o.label}
                          hint={o.hint}
                          icon={o.value === '12h' ? AccessTimeIcon : ScheduleIcon}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography
                      variant="caption"
                      fontWeight={500}
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block', letterSpacing: 0.2 }}
                    >
                      Units of measurement
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      {MEASUREMENT_OPTIONS.map((o) => (
                        <RadioCard
                          key={o.value}
                          value={o.value}
                          current={loc.measurement}
                          onChange={(v) => updateLoc({ measurement: v as MeasurementSystem })}
                          title={o.label}
                          hint={o.hint}
                          icon={o.value === 'imperial' ? StraightenIcon : SquareFootIcon}
                        />
                      ))}
                    </Box>
                  </Box>
                </FieldGrid>
              </ProfileSection>

              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
              >
                <Button
                  startIcon={<RestartAltIcon />}
                  color="inherit"
                  onClick={handleLocalizationResetToDefaults}
                  disabled={updateMe.isPending}
                >
                  Reset to defaults
                </Button>
              </Box>
            </>
          )}

          {active === 'notifications' && (
            <>
              <ProfileSection
                title="Email digest"
                subtitle="How often you receive a summary of activity in your organization."
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {DIGEST_OPTIONS.map((o) => (
                    <RadioCard
                      key={o.value}
                      value={o.value}
                      current={notif.digest}
                      onChange={(v) => updateNotif({ digest: v as DigestCadence })}
                      title={o.label}
                      hint={o.hint}
                      icon={
                        o.value === 'daily'
                          ? TodayIcon
                          : o.value === 'weekly'
                            ? DateRangeIcon
                            : NotificationsOffIcon
                      }
                    />
                  ))}
                </Box>
              </ProfileSection>

              <ProfileSection
                title="Event notifications"
                subtitle="Choose which emails you'd like to receive. Your organization controls which events are sent overall — turning a toggle off here means you personally won't get that email. Security alerts are always delivered."
              >
                {EVENT_TOGGLES.map((evt) => (
                  <ToggleRow
                    key={evt.key}
                    label={evt.label}
                    hint={evt.hint}
                    checked={notif[evt.key]}
                    onChange={(v) => updateNotif({ [evt.key]: v } as Partial<UserNotificationPreferences>)}
                  />
                ))}
              </ProfileSection>

              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
              >
                <Button
                  startIcon={<RestartAltIcon />}
                  color="inherit"
                  onClick={handleNotificationsResetToDefaults}
                  disabled={updateMe.isPending}
                >
                  Reset to defaults
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {footerVisible && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 3,
            py: 1.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid',
            borderColor: 'divider',
            zIndex: 1100,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            You have unsaved changes.
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              if (active === 'localization') setLoc(initialLocalization);
              else if (active === 'notifications') setNotif(initialNotifications);
            }}
            disabled={updateMe.isPending}
          >
            Discard
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              if (active === 'localization') handleLocalizationSave();
              else if (active === 'notifications') handleNotificationsSave();
            }}
            disabled={updateMe.isPending}
          >
            {updateMe.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </Paper>
      )}
    </Box>
  );
}
