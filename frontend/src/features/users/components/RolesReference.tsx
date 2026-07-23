'use client';

import { useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, Stack, Accordion, AccordionSummary,
  AccordionDetails, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useRoles } from '../hooks/useUsers';
import type { Role } from '@/types/user.types';

/**
 * Read-only reference of the roles provisioned for this organization and the
 * permissions each one carries. Editing role grants is intentionally not here:
 * it needs an audited backend mutation with a system-role guard, tracked as a
 * follow-up. This page answers "what can each role do", which is what an org
 * admin needs day to day.
 */

// Friendly labels for the resources a permission key targets (`action:resource`).
const RESOURCE_LABELS: Record<string, string> = {
  company: 'Company (full access)',
  all: 'Everything (platform)',
  organizations: 'Organization',
  users: 'People',
  roles: 'Roles',
  projects: 'Projects',
  project_members: 'Project members',
  phases: 'Phases',
  milestones: 'Milestones',
  tasks: 'Tasks',
  reports: 'Daily reports',
  issues: 'Issues',
  inspections: 'Inspections',
  rfis: 'RFIs',
  budget: 'Budget',
  suppliers: 'Suppliers',
  purchase_orders: 'Purchase orders',
  material_requests: 'Material requests',
  deliveries: 'Deliveries',
  documents: 'Documents',
  ai: 'AI assistant',
  bids: 'Subcontractor bids',
  tickets: 'Support tickets',
  audit_logs: 'Audit log',
  settings: 'Settings',
  dashboard: 'Dashboard',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
  assign: 'Assign',
  approve: 'Approve',
  reject: 'Reject',
  confirm: 'Confirm',
  upload: 'Upload',
  use: 'Use',
  manage: 'Full control',
};

interface ParsedPermission {
  action: string;
  resource: string;
}

function parse(key: string): ParsedPermission {
  const [action, resource] = key.split(':');
  return { action, resource: resource ?? action };
}

/** Group a role's permission keys by resource, so the UI reads by capability. */
function groupByResource(keys: string[]): { resource: string; actions: string[] }[] {
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const { action, resource } = parse(key);
    const list = map.get(resource) ?? [];
    list.push(action);
    map.set(resource, list);
  }
  return Array.from(map.entries())
    .map(([resource, actions]) => ({ resource, actions }))
    .sort((a, b) =>
      (RESOURCE_LABELS[a.resource] ?? a.resource).localeCompare(
        RESOURCE_LABELS[b.resource] ?? b.resource,
      ),
    );
}

function RoleCard({ role }: { role: Role }) {
  const keys = role.permissionKeys ?? [];
  const isWildcard = keys.includes('manage:company') || keys.includes('manage:all');
  const groups = useMemo(() => groupByResource(keys), [keys]);

  return (
    <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" gap={1.5} flex={1} flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={700}>
            {role.name}
          </Typography>
          {role.isSystem && (
            <Tooltip title="Built-in role provisioned for every organization">
              <Chip icon={<VerifiedUserIcon />} label="System" size="small" variant="outlined" />
            </Tooltip>
          )}
          <Box flex={1} />
          <Chip
            icon={<PeopleIcon />}
            label={`${role.userCount ?? 0} ${role.userCount === 1 ? 'user' : 'users'}`}
            size="small"
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {role.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {role.description}
          </Typography>
        )}

        {isWildcard ? (
          <Chip label="Full control over everything in the organization" color="primary" />
        ) : groups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No permissions granted.
          </Typography>
        ) : (
          <Stack gap={1.25}>
            {groups.map((g) => (
              <Box key={g.resource} display="flex" gap={1.5} alignItems="baseline" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
                  {RESOURCE_LABELS[g.resource] ?? g.resource}
                </Typography>
                <Box display="flex" gap={0.75} flexWrap="wrap">
                  {g.actions.map((a) => (
                    <Chip
                      key={a}
                      label={ACTION_LABELS[a] ?? a}
                      size="small"
                      color={a === 'manage' ? 'primary' : 'default'}
                      variant={a === 'manage' ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export function RolesReference() {
  const { data: roles, isLoading, isError, refetch } = useRoles();

  return (
    <Box>
      <PageHeader
        title="Roles"
        subtitle="Every role in your organization and the permissions it grants."
      />

      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && (
        <Stack gap={1.5}>
          {(roles ?? []).map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
          {(roles ?? []).length === 0 && (
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                No roles found for this organization.
              </Typography>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
}
