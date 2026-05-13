'use client';

import { Box } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function SurveyorBudgetPage() {
  return (
    <Box>
      <PageHeader title="Budget" subtitle="Cost plan vs. committed vs. spent." />
      <ModulePreview
        title="Budget tracking"
        description="See cost-plan baseline against commitments and actuals. Identify variances early. Coming soon."
        icon={AccountBalanceWalletIcon}
        statCards={[
          { label: 'Variance', value: '-2.4%', hint: 'Within tolerance' },
          { label: 'Committed', value: '$22.1M' },
          { label: 'Spent', value: '$22.1M' },
        ]}
        comingSoon="Phase 5 — Budget"
      />
    </Box>
  );
}
