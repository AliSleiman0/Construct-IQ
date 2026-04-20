'use client';

import { Fab, Tooltip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAiChatStore } from '../store/ai-chat.store';
import { useAuthStore } from '@/store/auth.store';
import { AiChatDrawer } from './AiChatDrawer';

export function AiChatFab() {
  const { isOpen, toggle } = useAiChatStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!isAuthenticated || !hasPermission('use:ai')) return null;

  return (
    <>
      <Tooltip title="AI Assistant" placement="left">
        <Fab
          color="primary"
          onClick={toggle}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <AutoAwesomeIcon />
        </Fab>
      </Tooltip>
      {isOpen && <AiChatDrawer />}
    </>
  );
}
