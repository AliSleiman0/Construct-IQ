'use client';

import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { PageHeader } from '@/components/shared/PageHeader';
import { TimelineView } from '@/features/projects/components/timeline/TimelineView';

function GuideLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography component="span" variant="caption" fontWeight={700} sx={{ mr: 0.5 }}>
        {label}:
      </Typography>
      <Typography component="span" variant="caption" sx={{ opacity: 0.9 }}>
        {children}
      </Typography>
    </Box>
  );
}

function TimelineGuide() {
  return (
    <Box sx={{ maxWidth: 300 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        How to read this page
      </Typography>
      <Stack gap={0.75}>
        <GuideLine label="Quarters">
          The coloured bands at the top split the year into Q1, Q2, Q3 and Q4.
        </GuideLine>
        <GuideLine label="Phases">
          Bars show stages of work and how long each one runs. Click a bar to edit.
        </GuideLine>
        <GuideLine label="Milestones">
          Pins above the axis mark key dates such as approvals or hand-overs. Click a pin to edit.
        </GuideLine>
        <GuideLine label="Today">
          The red vertical line shows today&apos;s date, so you can see where you are in the schedule.
        </GuideLine>
        <GuideLine label="Adding new items">
          Use the Add Phase or Add Milestone buttons in the top-right.
        </GuideLine>
      </Stack>
    </Box>
  );
}

export default function PMSchedulePage() {
  return (
    <Box>
      <PageHeader
        title="Schedule"
        subtitle="Gantt view of phases & milestones for the selected project."
        actions={
          <Tooltip
            title={<TimelineGuide />}
            arrow
            placement="bottom-end"
            enterDelay={150}
            leaveDelay={120}
            componentsProps={{
              tooltip: {
                sx: {
                  maxWidth: 320,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 3,
                  p: 1.5,
                },
              },
              arrow: {
                sx: { color: 'background.paper' },
              },
            }}
          >
            <IconButton size="small" aria-label="How this page works" sx={{ color: 'text.secondary' }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <TimelineView />
    </Box>
  );
}
