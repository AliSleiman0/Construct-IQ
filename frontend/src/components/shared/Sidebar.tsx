'use client';

import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Tooltip,
  Avatar,
} from '@mui/material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ArticleIcon from '@mui/icons-material/Article';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FolderIcon from '@mui/icons-material/Folder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/auth.store';
import { useCompanyStore } from '@/store/company.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: DashboardIcon },
  { label: 'Projects', href: ROUTES.PROJECTS, icon: FolderOpenIcon },
  { label: 'Tasks', href: ROUTES.TASKS, icon: TaskAltIcon },
  { label: 'Daily Reports', href: ROUTES.DAILY_REPORTS, icon: ArticleIcon },
  { label: 'Issues', href: ROUTES.ISSUES, icon: ReportProblemIcon, group: 'Operations' },
  { label: 'Budget', href: ROUTES.BUDGET, icon: AccountBalanceWalletIcon },
  { label: 'Procurement', href: ROUTES.SUPPLIERS, icon: LocalShippingIcon },
  { label: 'Documents', href: ROUTES.DOCUMENTS, icon: FolderIcon, group: 'Resources' },
  { label: 'AI Insights', href: ROUTES.AI_INSIGHTS, icon: AutoAwesomeIcon, group: 'AI' },
  { label: 'AI Assistant', href: ROUTES.AI_ASSISTANT, icon: ChatIcon },
  { label: 'Team Members', href: ROUTES.USERS, icon: PeopleIcon, group: 'Settings' },
];

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { selectedCompany, clearSelectedCompany } = useCompanyStore();

  const handleSwitchCompany = () => {
    clearSelectedCompany();
    router.push(ROUTES.COMPANY_SELECT);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <Box
      component="nav"
      sx={{
        width: collapsed ? 68 : SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: '#0F1923',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflowX: 'hidden',
        zIndex: 1200,
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: collapsed ? 1.5 : 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          minHeight: 64,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1 }}
          >
            CQ
          </Typography>
        </Box>
        {!collapsed && (
          <Box>
            <Typography
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.125rem',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              ConstructIQ
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
              {selectedCompany?.name ?? user?.organization?.name ?? 'Management Platform'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List dense disablePadding>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Tooltip
                key={item.href}
                title={collapsed ? item.label : ''}
                placement="right"
              >
                <ListItemButton
                  component={Link}
                  href={item.href}
                  selected={active}
                  sx={{
                    mx: 1,
                    my: 0.25,
                    px: collapsed ? 1.5 : 2,
                    py: 1,
                    borderRadius: 1.5,
                    minHeight: 40,
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                    backgroundColor: active
                      ? 'rgba(25,118,210,0.25)'
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: active
                        ? 'rgba(25,118,210,0.3)'
                        : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25,118,210,0.25)',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 'auto' : 36,
                      color: active ? '#42a5f5' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Bottom — Settings + User */}
      <Box
        sx={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          py: 1,
        }}
      >
        {/* Switch Company — visible to Super Admin only */}
        {user?.isSuperAdmin && (
          <Tooltip title={collapsed ? 'Switch Company' : ''} placement="right">
            <ListItemButton
              onClick={handleSwitchCompany}
              sx={{
                mx: 1,
                px: collapsed ? 1.5 : 2,
                py: 1,
                borderRadius: 1.5,
                color: 'rgba(255,193,7,0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255,193,7,0.1)',
                  color: '#ffc107',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36, color: 'inherit' }}>
                <SwapHorizIcon sx={{ fontSize: 20 }} />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary="Switch Company"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        )}
        <Tooltip title={collapsed ? 'Settings' : ''} placement="right">
          <ListItemButton
            component={Link}
            href={ROUTES.SETTINGS}
            sx={{
              mx: 1,
              px: collapsed ? 1.5 : 2,
              py: 1,
              borderRadius: 1.5,
              color: 'rgba(255,255,255,0.55)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#fff',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36, color: 'rgba(255,255,255,0.4)' }}>
              <SettingsIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        {user && (
          <Box
            sx={{
              mx: 1,
              mt: 0.5,
              p: 1.5,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <Avatar
              src={user.avatarUrl ?? undefined}
              alt={`${user.firstName} ${user.lastName}`}
              sx={{ width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}
            >
              {user.firstName[0]}{user.lastName[0]}
            </Avatar>
            {!collapsed && (
              <Box sx={{ overflow: 'hidden' }}>
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
