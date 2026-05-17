'use client';

import { useMemo } from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  useMediaQuery,
} from '@mui/material';
import { createAppTheme } from '@/constants/theme';
import { useOrgSettings } from '@/features/settings/hooks/useOrgSettings';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data } = useOrgSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });

  const theme = useMemo(() => {
    const brandColor = data?.brandColor ?? '#1976d2';
    const preference = (data?.theme ?? 'light') as 'light' | 'dark' | 'auto';
    const mode: 'light' | 'dark' =
      preference === 'auto' ? (prefersDark ? 'dark' : 'light') : preference;
    return createAppTheme(brandColor, mode);
  }, [data?.brandColor, data?.theme, prefersDark]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
