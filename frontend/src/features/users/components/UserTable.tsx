'use client';

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Avatar,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import { User } from '@/types/user.types';
import { UserStatusBadge } from './UserStatusBadge';
import { AppBadge } from '@/components/ui/AppBadge';

interface UserTableProps {
  users: User[];
  currentUserId: string;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function UserTable({ users, currentUserId, onEdit, onDeactivate }: UserTableProps) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={user.avatarUrl ?? undefined}
                    sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: 'primary.main' }}
                  >
                    {getInitials(user.firstName, user.lastName)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {user.firstName} {user.lastName}
                      {user.id === currentUserId && (
                        <AppBadge label="You" color="info" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {user.userRoles.length > 0 ? (
                    user.userRoles.map((ur) => (
                      <AppBadge key={ur.role.id} label={ur.role.name} color="default" />
                    ))
                  ) : (
                    <Typography variant="caption" color="text.disabled">No role</Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color={user.phone ? 'text.primary' : 'text.disabled'}>
                  {user.phone ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <UserStatusBadge status={user.status} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {new Date(user.createdAt).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit user">
                  <IconButton size="small" onClick={() => onEdit(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {user.id !== currentUserId && user.status === 'ACTIVE' && (
                  <Tooltip title="Deactivate user">
                    <IconButton size="small" color="error" onClick={() => onDeactivate(user)}>
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
