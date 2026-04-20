'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAiChatStore } from '../store/ai-chat.store';
import { useAiChat } from '../hooks/useAiChat';
import { AiMessageBubble } from './AiMessageBubble';

const DRAWER_WIDTH = 400;

export function AiChatDrawer() {
  const { isOpen, close, messages, appendMessage, resetConversation } = useAiChatStore();
  const [input, setInput] = useState('');
  const chatMutation = useAiChat();
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    appendMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    });
    chatMutation.mutate({ message: trimmed });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={close}
      PaperProps={{ sx: { width: DRAWER_WIDTH, display: 'flex', flexDirection: 'column' } }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          AI Assistant
        </Typography>
        <Box>
          <Tooltip title="New chat">
            <IconButton size="small" onClick={resetConversation}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={close}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, bgcolor: 'background.default' }}>
        {messages.length === 0 && !chatMutation.isPending && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Ask me to navigate or summarize a report.
            <br />
            e.g. &quot;take me to users&quot;
          </Typography>
        )}

        {messages.map((m) => (
          <AiMessageBubble key={m.id} message={m} />
        ))}

        {chatMutation.isPending && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
            <CircularProgress size={18} />
          </Box>
        )}

        <div ref={listEndRef} />
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={chatMutation.isPending}
          multiline
          maxRows={4}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={chatMutation.isPending || !input.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Drawer>
  );
}
