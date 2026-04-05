'use client';

import { Box, Typography, SvgIconProps } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import { ComponentType } from 'react';

interface AppEmptyStateProps {
  title: string;
  description?: string;
  icon?: ComponentType<SvgIconProps>;
  action?: React.ReactNode;
}

export function AppEmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
}: AppEmptyStateProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={8}
      px={2}
      textAlign="center"
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: 'primary.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Icon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.6 }} />
      </Box>
      <Typography variant="h6" fontWeight={600} color="text.primary" mb={0.5}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" maxWidth={360} mb={3}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
