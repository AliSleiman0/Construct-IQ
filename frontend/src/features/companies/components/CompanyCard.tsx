'use client';

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useState } from 'react';
import type { OrgListItem } from '@/lib/api/organizations.api';
import { useSetCompanyActive } from '../hooks/useCompanyMutations';

interface CompanyCardProps {
  company: OrgListItem;
  onSelect: (company: OrgListItem) => void;
  loading?: boolean;
}

export function CompanyCard({ company, onSelect, loading = false }: CompanyCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { mutate: setActive, isPending } = useSetCompanyActive();

  const initials = company.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: loading ? 'primary.main' : company.isActive ? 'divider' : 'error.light',
        transition: 'all 0.2s ease',
        opacity: company.isActive ? 1 : 0.75,
        '&:hover': {
          boxShadow: company.isActive && !loading ? 6 : 2,
          transform: company.isActive && !loading ? 'translateY(-2px)' : 'none',
        },
        position: 'relative',
      }}
    >
      {/* Loading overlay while switching to this company */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderRadius: 3,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
      {/* Overflow menu */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <Tooltip title="Options">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={menuAnchor}
          open={!!menuAnchor}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 160 } }}
        >
          <MenuItem
            disabled={isPending}
            onClick={() => {
              setMenuAnchor(null);
              setActive({ id: company.id, isActive: !company.isActive });
            }}
            sx={{ color: company.isActive ? 'error.main' : 'success.main', fontSize: '0.875rem' }}
          >
            {company.isActive ? 'Suspend Company' : 'Reactivate Company'}
          </MenuItem>
        </Menu>
      </Box>

      <CardActionArea
        onClick={() => company.isActive && !loading && onSelect(company)}
        disabled={!company.isActive || loading}
        sx={{ p: 0 }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar
              src={company.logoUrl ?? undefined}
              sx={{
                width: 52,
                height: 52,
                bgcolor: 'primary.main',
                fontSize: '1.125rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials || <BusinessIcon />}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                noWrap
                sx={{ lineHeight: 1.3 }}
              >
                {company.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {company.slug}
              </Typography>
            </Box>
          </Box>

          {/* Stats row */}
          <Box display="flex" gap={2} mb={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {company._count.users} users
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <FolderOpenIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {company._count.projects} projects
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* Status */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Chip
              label={company.isActive ? 'Active' : 'Suspended'}
              size="small"
              color={company.isActive ? 'success' : 'error'}
              variant="outlined"
            />
            {company.isActive && (
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Open →
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
