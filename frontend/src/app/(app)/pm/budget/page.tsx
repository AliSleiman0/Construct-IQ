'use client';

import { Box } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function PMBudgetPage() {
  return (
    <Box>
      <PageHeader title="Budget" subtitle="Read-only view across your projects." />
      <ModulePreview
        title="Budget"
        description="Track budget vs. spend by phase. Drill into commitments, change orders, and forecast at completion. Coming soon."
        icon={AccountBalanceWalletIcon}
        statCards={[
          { label: 'Tower Heights', value: '58%', hint: '$22.1M of $38.4M' },
          { label: 'Riverside', value: '89%' },
          { label: 'Phase II', value: '5%' },
        ]}
        comingSoon="Phase 5 — Budget"
      />
    </Box>
  );
}
