'use client';

import { Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function SuperAdminSettingsPage() {
  return (
    <Box>
      <PageHeader title="System Settings" subtitle="Platform-wide configuration." />
      <ModulePreview
        title="System settings"
        description="Email/SMTP, default policies, retention windows, feature flags, and SSO configuration. Coming soon."
        icon={SettingsIcon}
        comingSoon="Phase 8 — Hardening & Deployment"
      />
    </Box>
  );
}
