'use client';

import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { SIDEBAR_BY_ROLE } from '@/config/sidebar-nav';
import { ROLE_LABELS } from '@/config/roles';

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const theme = useTheme();
  const brand = theme.palette.primary.main;
  const brandLight = theme.palette.primary.light;

  const items = role ? SIDEBAR_BY_ROLE[role] : [];

  const isActive = (href: string) => {
    if (pathname === href) return true;
    // Allow detail/sub-routes (e.g. /admin/projects/123) to highlight the parent.
    return pathname.startsWith(`${href}/`);
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
            background: `linear-gradient(135deg, ${brand} 0%, ${brandLight} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1 }}>
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
              {role ? ROLE_LABELS[role] : 'Management Platform'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List dense disablePadding>
          {items.map((item) => {
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
                    backgroundColor: active ? alpha(brand, 0.25) : 'transparent',
                    '&:hover': {
                      backgroundColor: active
                        ? alpha(brand, 0.35)
                        : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(brand, 0.25),
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 'auto' : 36,
                      color: active ? brandLight : 'rgba(255,255,255,0.4)',
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
    </Box>
  );
}
