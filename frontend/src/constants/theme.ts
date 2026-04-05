import { createTheme, responsiveFontSizes } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    sidebar: string;
  }
  interface PaletteOptions {
    sidebar?: string;
  }
}

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: '#42a5f5',
      main: '#1976d2',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#ffb74d',
      main: '#f57c00',
      dark: '#e65100',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#64748b',
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
    caption: { fontSize: '0.75rem', lineHeight: 1.5, color: '#64748b' },
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
          backgroundColor: '#ffffff',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976d2',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
          border: '1px solid #f1f5f9',
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
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: '#64748b',
            letterSpacing: '0.025em',
            textTransform: 'uppercase',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f8fafc' },
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

export const theme = responsiveFontSizes(baseTheme);
