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
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { ROUTES } from '@/constants/routes';

const SIDEBAR_WIDTH = 260;

interface HeaderProps {
  pageTitle?: string;
}

export function Header({ pageTitle }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    router.push(ROUTES.LOGIN);
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push(ROUTES.PROFILE);
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

        {/* Actions */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Tooltip title="Notifications">
            <IconButton size="small">
              <Badge badgeContent={0} color="error">
                <NotificationsNoneIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 0.5 }}>
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

        {/* User menu */}
        <Menu
          anchorEl={anchorEl}
          open={!!anchorEl}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 3,
            sx: { mt: 1, minWidth: 200, borderRadius: 2 },
          }}
        >
          <Box px={2} py={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleProfile} sx={{ gap: 1.5, py: 1.25 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2">My Profile</Typography>
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
