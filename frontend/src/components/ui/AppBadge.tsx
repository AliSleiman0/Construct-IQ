'use client';

import { Chip, ChipProps } from '@mui/material';

interface AppBadgeProps extends Omit<ChipProps, 'color'> {
  color?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary' | 'secondary';
}

const colorMap: Record<string, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef9c3', text: '#854d0e' },
  error: { bg: '#fee2e2', text: '#991b1b' },
  info: { bg: '#dbeafe', text: '#1e40af' },
  default: { bg: '#f1f5f9', text: '#475569' },
  primary: { bg: '#dbeafe', text: '#1d4ed8' },
  secondary: { bg: '#fff7ed', text: '#c2410c' },
};

export function AppBadge({ color = 'default', sx, ...props }: AppBadgeProps) {
  const colors = colorMap[color] ?? colorMap.default;

  return (
    <Chip
      size="small"
      sx={{
        backgroundColor: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 22,
        borderRadius: '6px',
        ...sx,
      }}
      {...props}
    />
  );
}
