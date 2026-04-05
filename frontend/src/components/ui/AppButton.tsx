'use client';

import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { forwardRef } from 'react';

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ loading, disabled, children, startIcon, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

AppButton.displayName = 'AppButton';
