'use client';

import {
  Box,
  Paper,
  Typography,
  Stack,
  FormControlLabel,
  Switch,
  TextField,
  MenuItem,
  Button,
  Divider,
} from '@mui/material';
import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';

const LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

const TIME_FORMATS = [
  { value: '12h', label: '12-hour (3:45 PM)' },
  { value: '24h', label: '24-hour (15:45)' },
];

export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [language, setLanguage] = useState('en');
  const [timeFormat, setTimeFormat] = useState('12h');

  const handleSave = () =>
    enqueueSnackbar('Preferences saved.', { variant: 'success' });

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Notifications, language, and display preferences." />

      <Stack gap={2.5}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
            Notifications
          </Typography>
          <Typography variant="caption" color="text.secondary" mb={2} display="block">
            Choose how and when ConstructIQ reaches out.
          </Typography>
          <Stack gap={1}>
            <FormControlLabel
              control={<Switch checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Email notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Project updates, mentions, and assigned items.
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={<Switch checked={pushNotif} onChange={(e) => setPushNotif(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Push notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Real-time alerts on mobile and desktop.
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={<Switch checked={mentionAlerts} onChange={(e) => setMentionAlerts(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    @-mentions only
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reduce noise — only ping me when I'm tagged directly.
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={<Switch checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Weekly digest
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Summary of activity sent every Monday.
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Display
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              select
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              sx={{ flex: 1 }}
            >
              {LANGUAGES.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {l.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Time format"
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value)}
              sx={{ flex: 1 }}
            >
              {TIME_FORMATS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>

        <Box display="flex" justifyContent="flex-end">
          <Button variant="contained" onClick={handleSave}>
            Save preferences
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
