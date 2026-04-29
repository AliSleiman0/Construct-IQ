'use client';

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { mockDemoUsers } from '@/mocks/users.mock';

export default function OrgAdminsPage() {
  const { enqueueSnackbar } = useSnackbar();
  // Show all org-level admins across tenants. We expand the seed list with a few
  // synthetic entries so the table doesn't look empty.
  const seedAdmins = mockDemoUsers.filter((u) => u.roles.includes('ORG_ADMIN'));
  const synthetic = [
    { name: 'Marcus Bell', email: 'marcus@companyb.com', orgName: 'Company B' },
    { name: 'Lin Tanaka', email: 'lin@companyc.com', orgName: 'Company C' },
    { name: 'Priscilla Faria', email: 'priscilla@companya.com', orgName: 'Company A' },
  ];

  const handleDemote = (email: string) =>
    enqueueSnackbar(`${email} demoted from Org Admin.`, { variant: 'info' });

  return (
    <Box>
      <PageHeader
        title="Org Admins"
        subtitle="Promote / demote organization-level admins across all tenants."
      />

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Admin</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {seedAdmins.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                      {u.firstName[0]}
                      {u.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {u.firstName} {u.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {u.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{u.organization.name}</TableCell>
                <TableCell>
                  <Chip label="Org Admin" color="primary" size="small" sx={{ fontWeight: 600 }} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => handleDemote(u.email)}>
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {synthetic.map((s) => (
              <TableRow key={s.email} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                      {s.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{s.orgName}</TableCell>
                <TableCell>
                  <Chip label="Org Admin" color="primary" size="small" sx={{ fontWeight: 600 }} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => handleDemote(s.email)}>
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
