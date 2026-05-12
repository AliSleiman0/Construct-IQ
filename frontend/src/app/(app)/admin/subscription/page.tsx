'use client';

import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GroupIcon from '@mui/icons-material/Group';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloudIcon from '@mui/icons-material/Cloud';
import InfoIcon from '@mui/icons-material/Info';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';

const FEATURES = [
  'Up to 50 members',
  'Up to 50 projects',
  'Priority support (24h response)',
  'Advanced reports & dashboards',
  'Document storage \u2014 100 GB',
  'API access (REST + Webhooks)',
];

const USAGE = [
  { label: 'Members', current: 12, max: 50, icon: GroupIcon, color: 'primary' as const },
  { label: 'Projects', current: 6, max: 50, icon: FolderOpenIcon, color: 'info' as const },
  { label: 'Storage', current: 8.2, max: 100, unit: 'GB', icon: CloudIcon, color: 'success' as const },
];

export default function AdminSubscriptionPage() {
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Box>
      <PageHeader
        title="Subscription"
        subtitle="Manage your plan, view usage limits, and change tiers anytime."
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        {/* Current Plan */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3, mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Chip label="ACTIVE" color="success" size="small" sx={{ fontWeight: 600 }} />
                <Typography variant="caption" color="text.secondary">
                  Renews May 28, 2026
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={500} sx={{ mb: 0.5 }}>
                Professional
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ fontSize: 36, fontWeight: 500 }}>$299</Typography>
                <Typography variant="body2" color="text.secondary">/ month</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <WorkspacePremiumIcon sx={{ fontSize: 40 }} />
            </Box>
          </Box>

          <Typography
            variant="overline"
            sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', display: 'block', mb: 1.5 }}
          >
            What&apos;s included
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
            {FEATURES.map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'success.light',
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: 0.8,
                  }}
                >
                  <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AppButton
              variant="contained"
              startIcon={<ArrowUpwardIcon />}
              onClick={() =>
                enqueueSnackbar('Enterprise upgrade quote requested. Our team will reach out within 1 business day.', { variant: 'success' })
              }
            >
              Upgrade to Enterprise
            </AppButton>
            <AppButton
              variant="outlined"
              color="inherit"
              onClick={() =>
                enqueueSnackbar('Downgrade flow is not available in this demo.', { variant: 'error' })
              }
            >
              Downgrade
            </AppButton>
          </Box>
        </Paper>

        {/* Usage */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2.5 }}>
            Usage this month
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {USAGE.map((u) => {
              const pct = (u.current / u.max) * 100;
              const Icon = u.icon;
              const valText = u.unit ? `${u.current} ${u.unit}` : String(u.current);
              const maxText = u.unit ? `${u.max} ${u.unit}` : String(u.max);
              return (
                <Box key={u.label}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight={500}>{u.label}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      <Typography component="span" variant="caption" color="text.primary" fontWeight={500}>
                        {valText}
                      </Typography>
                      {' '}of {maxText}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={u.color}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {Math.round(pct)}% used
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              mt: 3,
              p: 1.5,
              bgcolor: 'info.lighter',
              background: '#e5f6fd',
              borderRadius: 1.5,
              display: 'flex',
              gap: 1.25,
            }}
          >
            <InfoIcon sx={{ fontSize: 18, color: 'info.main', flexShrink: 0, mt: 0.125 }} />
            <Typography variant="caption" sx={{ lineHeight: 1.5, color: 'text.primary' }}>
              You&apos;re using <strong>24%</strong> of your members and <strong>8.2%</strong> of your storage. Plenty of room.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
