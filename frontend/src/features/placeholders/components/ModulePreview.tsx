'use client';

import { Box, Paper, Typography, Stack } from '@mui/material';
import type { ElementType, ReactNode } from 'react';

interface StatCardData {
  label: string;
  value: ReactNode;
  hint?: string;
}

interface ModulePreviewProps {
  title: string;
  description: string;
  icon: ElementType;
  statCards?: StatCardData[];
  comingSoon?: string;
}

export function ModulePreview({
  title,
  description,
  icon: Icon,
  statCards,
  comingSoon,
}: ModulePreviewProps) {
  return (
    <Box>
      {statCards && statCards.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(statCards.length, 4)}, 1fr)` },
            mb: 3,
          }}
        >
          {statCards.map((s) => (
            <Paper
              key={s.label}
              elevation={0}
              sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}
              >
                {s.label}
              </Typography>
              <Typography variant="h4" fontWeight={700} mt={0.5}>
                {s.value}
              </Typography>
              {s.hint && (
                <Typography variant="caption" color="text.secondary">
                  {s.hint}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Stack alignItems="center" gap={2}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              bgcolor: 'rgba(25,118,210,0.08)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ fontSize: 32 }} />
          </Box>
          <Box maxWidth={520}>
            <Typography variant="h6" fontWeight={600} mb={0.5}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            {comingSoon && (
              <Typography variant="caption" color="primary.main" mt={1.5} display="block" sx={{ fontWeight: 600 }}>
                {comingSoon}
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
