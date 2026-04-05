'use client';

import { Box, CircularProgress, Typography } from '@mui/material';

interface AppLoaderProps {
  message?: string;
  fullHeight?: boolean;
  size?: number;
}

export function AppLoader({
  message,
  fullHeight = false,
  size = 40,
}: AppLoaderProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      sx={{ minHeight: fullHeight ? '60vh' : 200 }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
