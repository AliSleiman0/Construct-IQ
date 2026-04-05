'use client';

import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface AppErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function AppErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: AppErrorStateProps) {
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
          backgroundColor: 'error.light',
          opacity: 0.15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          position: 'relative',
        }}
      >
        <ErrorOutlineIcon
          sx={{ fontSize: 36, color: 'error.main', position: 'absolute' }}
        />
      </Box>
      <Typography variant="h6" fontWeight={600} color="text.primary" mb={0.5}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={360} mb={3}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry} size="small">
          Try Again
        </Button>
      )}
    </Box>
  );
}
