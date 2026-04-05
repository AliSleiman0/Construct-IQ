'use client';

import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthInitializer } from '@/features/auth/hooks/useCurrentUser';

const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 64;

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Bootstrap auth state from /auth/me on app mount
  useAuthInitializer();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${SIDEBAR_WIDTH}px`,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />
        <Box
          sx={{
            mt: `${HEADER_HEIGHT}px`,
            flex: 1,
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
