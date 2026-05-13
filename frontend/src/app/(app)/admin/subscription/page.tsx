'use client';

import { Box, Paper, Typography, Stack, Button, Chip, Divider, LinearProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { mockPlans } from '@/mocks/plans.mock';

export default function AdminSubscriptionPage() {
  const { enqueueSnackbar } = useSnackbar();
  const current = mockPlans.find((p) => p.id === 'plan-pro')!;
  const usersUsed = 12;
  const projectsUsed = 3;

  return (
    <Box>
      <PageHeader
        title="Subscription"
        subtitle="Your current plan and usage."
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'primary.light' }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="overline" sx={{ fontWeight: 600 }}>
                Current plan
              </Typography>
              <Chip label="Active" color="success" size="small" sx={{ fontWeight: 600 }} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Renews May 1, 2026
            </Typography>
          </Box>

          <Box display="flex" alignItems="baseline" gap={0.5} mb={2}>
            <Typography variant="h3" fontWeight={700}>
              ${current.pricePerMonth}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              /month — {current.name} plan
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            What's included
          </Typography>
          <Stack gap={1} mb={3}>
            {current.features.map((f) => (
              <Box key={f} display="flex" alignItems="center" gap={1}>
                <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
          </Stack>

          <Box display="flex" gap={1.5}>
            <Button
              variant="contained"
              onClick={() => enqueueSnackbar('Upgrade flow opened (demo).', { variant: 'info' })}
            >
              Upgrade to Enterprise
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => enqueueSnackbar('Downgrade scheduled for next billing cycle.', { variant: 'warning' })}
            >
              Downgrade
            </Button>
          </Box>
        </Paper>

        <Stack gap={2}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Usage
            </Typography>
            <Box mb={2}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Members
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {usersUsed} of {current.maxUsers}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(usersUsed / current.maxUsers) * 100}
                sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Projects
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {projectsUsed} of {current.maxProjects}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(projectsUsed / current.maxProjects) * 100}
                sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
              />
            </Box>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
