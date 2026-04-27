'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  useTheme,
  ThemeProvider,
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { theme as baseTheme } from '@/constants/theme';
import { useAiChatStore } from '../store/ai-chat.store';
import { useAiChat } from '../hooks/useAiChat';
import { AiMessageBubble } from './AiMessageBubble';

const DRAWER_WIDTH = 400;

export function AiChatDrawer() {
  const { isOpen, close, messages, appendMessage, resetConversation, isPinned, togglePin } =
    useAiChatStore();
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<'light' | 'dark'>('light');
  const toggleChatMode = () => setChatMode((m) => (m === 'light' ? 'dark' : 'light'));
  const chatMutation = useAiChat();
  const listEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const floatTheme = useMemo(() => {
    const isDark = chatMode === 'dark';
    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        mode: chatMode,
        ...(isDark && {
          background: { default: '#121212', paper: '#1e1e1e' },
          text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.7)' },
        }),
      },
      components: {
        ...baseTheme.components,
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              backgroundColor: isDark ? '#2c2c2c' : '#ffffff',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: isDark ? '#ffffff' : '#1a202c',
            },
          },
        },
        MuiTypography: {
          styleOverrides: {
            root: {
              color: isDark ? '#ffffff' : '#1a202c',
            },
          },
        },
      },
    });
  }, [chatMode]);

  // Floating window drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => {
      dragging.current = false;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    const rect = (
      e.currentTarget.closest('[data-float-window]') as HTMLElement
    ).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleClose = () => {
    setPos(null);
    close();
  };

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

  const pinButton = (
    <Tooltip title={isPinned ? 'Unpin' : 'Pin to side'}>
      <IconButton size="small" onClick={togglePin}>
        {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );

  const chatBody = (
    <>
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
          onClick={handleSend}
          disabled={chatMutation.isPending || !input.trim()}
          sx={{
            color: chatMode === 'dark' ? '#ffffff' : 'primary.main',
            '&.Mui-disabled': {
              color: chatMode === 'dark' ? 'rgba(255,255,255,0.3)' : undefined,
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </>
  );

  if (isPinned) {
    return (
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
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
            {pinButton}
            <Tooltip title="New chat">
              <IconButton size="small" onClick={resetConversation}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {chatBody}
      </Drawer>
    );
  }

  if (!isOpen) return null;

  const floatPos = pos
    ? { left: pos.x, top: pos.y }
    : { bottom: 90, right: 24 };

  return (
    <ThemeProvider theme={floatTheme}>
      <Box
        data-float-window
        sx={{
          position: 'fixed',
          ...floatPos,
          width: 380,
          height: 520,
          zIndex: theme.zIndex.modal + 1,
          borderRadius: 2,
          boxShadow: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: chatMode === 'dark' ? 'transparent' : '#e2e8f0',
        }}
      >
        <Box
          onMouseDown={onHeaderMouseDown}
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            AI Assistant
          </Typography>
          <Box>
            <Tooltip title={chatMode === 'light' ? 'Dark mode' : 'Light mode'}>
              <IconButton size="small" onClick={toggleChatMode}>
                {chatMode === 'light' ? (
                  <DarkModeIcon fontSize="small" />
                ) : (
                  <LightModeIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            {pinButton}
            <Tooltip title="New chat">
              <IconButton size="small" onClick={resetConversation}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {chatBody}
      </Box>
    </ThemeProvider>
  );
}
