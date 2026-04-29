'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { organizationsApi, type OrgListItem } from '@/lib/api/organizations.api';
import { useCompanyStore } from '@/store/company.store';
import { ROLE_HOME } from '@/config/roles';

export default function CompanySelectPage() {
  const router = useRouter();
  const setSelectedCompany = useCompanyStore((s) => s.setSelectedCompany);

  const { data: orgs, isLoading, isError, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  });

  const handlePick = (org: OrgListItem) => {
    setSelectedCompany({ id: org.id, name: org.name, slug: org.slug });
    router.replace(ROLE_HOME.SUPER_ADMIN);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
          Select an organization
        </Typography>
        <Typography variant="body1" color="text.secondary" mt={1}>
          Pick a tenant to operate in. You can switch from the account menu at any time.
        </Typography>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          Could not load organizations: {(error as Error)?.message ?? 'Unknown error'}
        </Alert>
      )}

      {orgs && orgs.length === 0 && (
        <Alert severity="info">No organizations exist yet. Create one from the Organizations page.</Alert>
      )}

      {orgs && orgs.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
          }}
        >
          {orgs.map((org) => (
            <Card
              key={org.id}
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 12px -4px rgba(25,118,210,0.25)',
                },
              }}
            >
              <CardActionArea onClick={() => handlePick(org)} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <BusinessIcon />
                    </Box>
                    <Box minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {org.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {org.slug}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={org.isActive ? 'Active' : 'Suspended'}
                      size="small"
                      color={org.isActive ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`${org._count.users} users`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`${org._count.projects} projects`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
