'use client';

import { Box } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ArticleIcon from '@mui/icons-material/Article';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function PMDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="PM Dashboard"
        subtitle="Tower Heights · Riverside Tower · Phase II Annex."
      />

      <StatGrid>
        <StatCard label="My Projects" value="3" hint="All on schedule" icon={FolderOpenIcon} tone="primary" />
        <StatCard label="Open Tasks" value="42" hint="9 due this week" icon={TaskAltIcon} tone="info" />
        <StatCard label="Issues to Triage" value="5" hint="2 escalated" icon={ReportProblemIcon} tone="warning" />
        <StatCard label="Reports This Week" value="14" hint="2 outstanding sign-offs" icon={ArticleIcon} tone="success" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Task throughput" subtitle="Closed per day, last 7 days">
          <MiniBarChart
            data={[
              { label: 'Mo', value: 3 },
              { label: 'Tu', value: 7 },
              { label: 'We', value: 5 },
              { label: 'Th', value: 9 },
              { label: 'Fr', value: 6 },
              { label: 'Sa', value: 1 },
              { label: 'Su', value: 0 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Budget burn — Tower Heights" subtitle="Spend per phase">
          <MiniBarChart
            color="#f59e0b"
            data={[
              { label: 'Found.', value: 100 },
              { label: 'Struct.', value: 78 },
              { label: 'Envel.', value: 42 },
              { label: 'MEP', value: 18 },
              { label: 'Finish', value: 4 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
