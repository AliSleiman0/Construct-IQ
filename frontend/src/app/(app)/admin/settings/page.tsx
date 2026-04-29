'use client';

import { Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function AdminSettingsPage() {
  return (
    <Box>
      <PageHeader title="Settings" subtitle="Organization profile, branding, address." />
      <ModulePreview
        title="Org settings"
        description="Update your org's profile, logo, contact info, and notification preferences. Coming soon."
        icon={SettingsIcon}
        comingSoon="Phase 8 — Hardening & Deployment"
      />
    </Box>
  );
}
