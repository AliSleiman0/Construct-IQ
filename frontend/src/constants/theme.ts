import {
  createTheme,
  responsiveFontSizes,
  lighten,
  darken,
  type Theme,
} from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    sidebar: string;
  }
  interface PaletteOptions {
    sidebar?: string;
  }
}

export function createAppTheme(
  brandColor: string = '#1976d2',
  mode: 'light' | 'dark' = 'light',
): Theme {
  const isDark = mode === 'dark';
  const surfaceDefault = isDark ? '#0f172a' : '#f8fafc';
  const surfacePaper = isDark ? '#1e293b' : '#ffffff';
  const textPrimary = isDark ? '#f1f5f9' : '#1a202c';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  const base = createTheme({
    palette: {
      mode,
      primary: {
        main: brandColor,
        light: lighten(brandColor, 0.3),
        dark: darken(brandColor, 0.2),
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#ffb74d',
        main: '#f57c00',
        dark: '#e65100',
        contrastText: '#ffffff',
      },
      background: {
        default: surfaceDefault,
        paper: surfacePaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      info: { main: '#3b82f6' },
      sidebar: '#0F1923',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h1: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2 },
      h2: { fontWeight: 700, fontSize: '1.875rem', lineHeight: 1.25 },
      h3: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
      h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35 },
      h5: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
      h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5, color: textSecondary },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    },
    shape: {
      borderRadius: 10,
    },
    shadows: [
      'none',
      '0 1px 2px 0 rgba(0,0,0,0.05)',
      '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
      '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
      '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
      '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      '0 25px 50px -12px rgba(0,0,0,0.25)',
      ...Array(18).fill('none'),
    ] as any,
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            fontWeight: 600,
            fontSize: '0.875rem',
          },
          sizeLarge: { padding: '10px 28px', fontSize: '1rem' },
          sizeSmall: { padding: '5px 14px', fontSize: '0.8125rem' },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', fullWidth: true },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: surfacePaper,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: brandColor,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
            border: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: textSecondary,
              letterSpacing: '0.025em',
              textTransform: 'uppercase',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: isDark ? '#1e293b' : '#f8fafc' },
            '&.MuiTableRow-head': { '&:hover': { backgroundColor: 'transparent' } },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, height: 6 },
        },
      },
    },
  });

  return responsiveFontSizes(base);
}

export const theme = createAppTheme();
