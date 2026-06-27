'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Badge,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useCompanyStore } from '@/store/company.store';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { ROLE_LABELS } from '@/config/roles';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/hooks/useNotifications';
import Button from '@mui/material/Button';

const SIDEBAR_WIDTH = 260;

interface HeaderProps {
  pageTitle?: string;
}

const NOTIFICATION_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  info: 'info',
  warning: 'warning',
  success: 'success',
  error: 'error',
};

const formatRelative = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function Header({ pageTitle }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const selectedCompany = useCompanyStore((s) => s.selectedCompany);
  const clearSelectedCompany = useCompanyStore((s) => s.clearSelectedCompany);
  const { logout } = useLogout();
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const closeAccount = () => setAccountAnchor(null);
  const closeNotif = () => setNotifAnchor(null);

  const handleLogout = async () => {
    closeAccount();
    clearSelectedCompany();
    await logout();
    // Hard navigation ensures all React state, caches, and stale cookies are
    // fully discarded — prevents re-login from seeing the previous user's session.
    window.location.href = '/login';
  };

  const handleProfile = () => {
    closeAccount();
    router.push('/profile');
  };

  const handleSettings = () => {
    closeAccount();
    router.push('/settings');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        left: SIDEBAR_WIDTH,
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        color: 'text.primary',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
        {pageTitle && (
          <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ flex: 1 }}>
            {pageTitle}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />

        {user?.isSuperAdmin && selectedCompany && (
          <Chip
            label={selectedCompany.name}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 1, fontWeight: 500, fontSize: '0.7rem' }}
          />
        )}

        {role && (
          <Chip
            label={ROLE_LABELS[role]}
            size="small"
            variant="outlined"
            sx={{ mr: 1.5, fontWeight: 500, fontSize: '0.7rem' }}
          />
        )}

        {/* Actions */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Tooltip title="Notifications">
            <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsNoneIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton onClick={(e) => setAccountAnchor(e.currentTarget)} size="small" sx={{ ml: 0.5 }}>
              <Avatar
                src={user?.avatarUrl ?? undefined}
                alt={user ? `${user.firstName} ${user.lastName}` : 'User'}
                sx={{ width: 34, height: 34, fontSize: '0.85rem' }}
              >
                {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notifications dropdown */}
        <Menu
          anchorEl={notifAnchor}
          open={!!notifAnchor}
          onClose={closeNotif}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ elevation: 3, sx: { mt: 1, minWidth: 340, maxWidth: 380, borderRadius: 2 } }}
        >
          <Box px={2} py={1.5} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={600}>
              Notifications
            </Typography>
            {unreadCount > 0 ? (
              <Button
                size="small"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 0, p: 0.25 }}
              >
                Mark all read
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {unreadCount} unread
              </Typography>
            )}
          </Box>
          <Divider />
          <List disablePadding sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <ListItem sx={{ py: 3, justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  You're all caught up.
                </Typography>
              </ListItem>
            )}
            {notifications.map((n) => (
              <ListItem
                key={n._id}
                alignItems="flex-start"
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n._id);
                }}
                sx={{
                  px: 2,
                  py: 1.25,
                  cursor: n.isRead ? 'default' : 'pointer',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: n.isRead ? 'transparent' : 'action.hover',
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={n.type}
                        size="small"
                        color={NOTIFICATION_COLOR[n.type] ?? 'default'}
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
                      />
                      <Typography variant="body2" fontWeight={n.isRead ? 400 : 600}>
                        {n.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box mt={0.5}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {n.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" component="div">
                        {formatRelative(n.createdAt)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Menu>

        {/* Account dropdown */}
        <Menu
          anchorEl={accountAnchor}
          open={!!accountAnchor}
          onClose={closeAccount}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ elevation: 3, sx: { mt: 1, minWidth: 220, borderRadius: 2 } }}
        >
          <Box px={2} py={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              {user?.email}
            </Typography>
            {role && (
              <Typography variant="caption" color="text.disabled" component="div">
                {ROLE_LABELS[role]}
              </Typography>
            )}
          </Box>
          <Divider />
          <MenuItem onClick={handleProfile} sx={{ gap: 1.5, py: 1.25 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2">Profile</Typography>
          </MenuItem>
          <MenuItem onClick={handleSettings} sx={{ gap: 1.5, py: 1.25 }}>
            <SettingsIcon fontSize="small" color="action" />
            <Typography variant="body2">Settings</Typography>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            sx={{ gap: 1.5, py: 1.25, color: 'error.main' }}
          >
            <LogoutIcon fontSize="small" />
            <Typography variant="body2">Log Out</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
