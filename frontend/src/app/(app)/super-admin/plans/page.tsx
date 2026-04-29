'use client';

import { Box, Paper, Typography, Stack, Chip, Divider } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { PageHeader } from '@/components/shared/PageHeader';
import { mockPlans } from '@/mocks/plans.mock';

export default function PlansPage() {
  return (
    <Box>
      <PageHeader
        title="Plans"
        subtitle="Subscription tiers and the features tied to each."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {mockPlans.map((p) => (
          <Paper
            key={p.id}
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: p.isPopular ? 'primary.light' : 'divider',
              bgcolor: p.isPopular ? 'rgba(25,118,210,0.04)' : 'background.paper',
              position: 'relative',
            }}
          >
            {p.isPopular && (
              <Chip
                label="Most popular"
                color="primary"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  fontWeight: 600,
                }}
              />
            )}
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
              {p.name}
            </Typography>
            <Box display="flex" alignItems="baseline" gap={0.5} mb={1}>
              <Typography variant="h3" fontWeight={700}>
                ${p.pricePerMonth.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                /month
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {p.description}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack gap={1}>
              {p.features.map((f) => (
                <Box key={f} display="flex" alignItems="center" gap={1}>
                  <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2">{f}</Typography>
                </Box>
              ))}
            </Stack>
            <Box mt={3}>
              <Typography variant="caption" color="text.secondary">
                {p.maxUsers >= 9999 ? 'Unlimited users' : `Up to ${p.maxUsers} users`} ·{' '}
                {p.maxProjects >= 9999 ? 'Unlimited projects' : `Up to ${p.maxProjects} projects`}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
