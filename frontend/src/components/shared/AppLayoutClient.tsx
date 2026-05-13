'use client';

import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AiChatFab } from '@/features/ai/components/AiChatFab';

const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 64;

interface AppLayoutClientProps {
  children: React.ReactNode;
}

/**
 * Client-side chrome (sidebar, header, AI fab) for any (app)/* route.
 * Authentication and role-prefix gating happen one level up in the
 * Server Component layout — by the time this renders, the auth store
 * has already been hydrated by AuthHydrator with a verified user.
 */
export function AppLayoutClient({ children }: AppLayoutClientProps) {
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
        <Box sx={{ mt: `${HEADER_HEIGHT}px`, flex: 1, p: 3 }}>{children}</Box>
      </Box>
      <AiChatFab />
    </Box>
  );
}
