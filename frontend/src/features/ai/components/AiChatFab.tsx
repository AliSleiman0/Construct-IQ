'use client';

import { Fab, Tooltip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAiChatStore } from '../store/ai-chat.store';
import { useAuthStore } from '@/store/auth.store';
import { useAiFeatures } from '@/features/org-features/hooks/useAiFeatures';
import { AI_FEATURE_KEYS } from '@/constants/ai-feature-keys';
import { AiChatDrawer } from './AiChatDrawer';

export function AiChatFab() {
  const { isOpen, toggle } = useAiChatStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { hasAiFeature, isLoading: aiLoading } = useAiFeatures();

  // Hide entirely if user lacks the role-based permission. For AI subscription
  // gating, only hide once the resolver finished loading — otherwise the FAB
  // flickers out on every page nav before the subscription resolves.
  if (!isAuthenticated || !hasPermission('use:ai')) return null;
  if (!aiLoading && !hasAiFeature(AI_FEATURE_KEYS.AI_ASSISTANT)) return null;

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
