'use client';

import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  TextField,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/AppButton';
import { CompanyCard } from '@/features/companies/components/CompanyCard';
import { AddCompanyModal } from '@/features/companies/components/AddCompanyModal';
import { useCompanies } from '@/features/companies/hooks/useCompanies';
import { useCompanyStore } from '@/store/company.store';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { ROUTES } from '@/constants/routes';
import type { OrgListItem } from '@/lib/api/organizations.api';

export default function CompanySelectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const { setSelectedCompany } = useCompanyStore();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();

  const { data: companies, isLoading, error } = useCompanies();

  const filtered = useMemo(() => {
    if (!companies) return [];
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [companies, search]);

  const activeCount = companies?.filter((c) => c.isActive).length ?? 0;
  const suspendedCount = companies?.filter((c) => !c.isActive).length ?? 0;

  const handleSelect = async (company: OrgListItem) => {
    if (switching) return;
    setSwitching(company.id);
    // Store the new company identity first so the cookie & localStorage are
    // updated before any subsequent request fires.
    setSelectedCompany({
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
    });
    // Wipe every cached query so the dashboard loads fresh data for the new
    // company — no stale data from the previous context leaks through.
    await queryClient.resetQueries();
    router.push(ROUTES.DASHBOARD);
  };

  const handleLogout = async () => {
    await logout();
    router.push(ROUTES.LOGIN);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          px: 4,
          py: 2,
          backgroundColor: '#0F1923',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>CQ</Typography>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.125rem' }}>
            ConstructIQ
          </Typography>
          <Chip label="Super Admin" size="small" color="warning" sx={{ ml: 1 }} />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <AppButton
            size="small"
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)', ml: 1 }}
          >
            Logout
          </AppButton>
        </Box>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, maxWidth: 1200, mx: 'auto', width: '100%', px: 4, py: 6 }}>
        {/* Page header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
              Select a Company
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Choose the company workspace you want to manage
            </Typography>
          </Box>
          <AppButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            size="large"
          >
            Add New Company
          </AppButton>
        </Box>

        {/* Stats row */}
        <Box display="flex" gap={2} mb={4}>
          <Box
            sx={{
              px: 3, py: 2, borderRadius: 2,
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}
          >
            <BusinessIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1}>{companies?.length ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Total Companies</Typography>
            </Box>
          </Box>
          <Box
            sx={{
              px: 3, py: 2, borderRadius: 2,
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1}>{activeCount}</Typography>
              <Typography variant="caption" color="text.secondary">Active</Typography>
            </Box>
          </Box>
          {suspendedCount > 0 && (
            <Box
              sx={{
                px: 3, py: 2, borderRadius: 2,
                backgroundColor: '#fff',
                border: '1px solid #fee2e2',
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1} color="error.main">{suspendedCount}</Typography>
                <Typography variant="caption" color="text.secondary">Suspended</Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Search */}
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          size="small"
          sx={{ mb: 3, maxWidth: 400, width: '100%', backgroundColor: '#fff', borderRadius: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Content */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load companies. Please try again.</Alert>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              py: 10,
              textAlign: 'center',
              backgroundColor: '#fff',
              borderRadius: 3,
              border: '1px dashed #e2e8f0',
            }}
          >
            <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {search ? 'No companies match your search' : 'No companies yet'}
            </Typography>
            {!search && (
              <AppButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)}
                sx={{ mt: 2 }}
              >
                Add First Company
              </AppButton>
            )}
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filtered.map((company) => (
              <Grid item xs={12} sm={6} md={4} key={company.id}>
                <CompanyCard
                  company={company}
                  onSelect={handleSelect}
                  loading={switching === company.id}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <AddCompanyModal open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  );
}
