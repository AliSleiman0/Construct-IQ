'use client';

import { Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function PMDocumentsPage() {
  return (
    <Box>
      <PageHeader title="Documents" subtitle="Drawings, contracts, and RFIs for your projects." />
      <ModulePreview
        title="Documents"
        description="Browse drawings by sheet, contract docs, RFIs, and submittals. Versioned with approval workflow. Coming soon."
        icon={FolderIcon}
        statCards={[
          { label: 'Drawings', value: '186' },
          { label: 'Contracts', value: '14' },
          { label: 'Open RFIs', value: '7' },
        ]}
        comingSoon="Phase 6 — Documents"
      />
    </Box>
  );
}
