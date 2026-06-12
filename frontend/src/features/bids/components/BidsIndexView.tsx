'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/store/auth.store';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useBids, useDeleteBid } from '../hooks/useBids';
import { BidCard } from './BidCard';
import { BidComparisonTable } from './BidComparisonTable';
import type { Bid } from '@/types/bids.types';

interface BidsIndexViewProps {
  /** Path prefix where a project's bid page lives, e.g. "/pm/projects" or "/procurement/projects". */
  projectRouteBase: string;
}

export function BidsIndexView({ projectRouteBase }: BidsIndexViewProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const can = (p: string) => isSuperAdmin || hasPermission(p);
  const canCreate = can('create:bids');
  const canDelete = can('delete:bids');

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [projectFilter, setProjectFilter] = useState<string>('');
  const [uploadProjectId, setUploadProjectId] = useState<string>('');

  const projectsQuery = useProjects();
  const { data, isLoading, isError, refetch } = useBids(
    projectFilter ? { projectId: projectFilter } : undefined,
  );
  const deleteBid = useDeleteBid();

  const projects = projectsQuery.data ?? [];
  const projectById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const bids = data ?? [];

  // Group: project → trade package → bids[]
  const groups = useMemo(() => {
    type Group = { projectId: string; tradePackage: string; items: Bid[] };
    const groupsMap = new Map<string, Group>();
    for (const b of bids) {
      const key = `${b.projectId}::${b.tradePackage}`;
      const g = groupsMap.get(key) ?? {
        projectId: b.projectId,
        tradePackage: b.tradePackage,
        items: [],
      };
      g.items.push(b);
      groupsMap.set(key, g);
    }
    return Array.from(groupsMap.values()).sort((a, b) => {
      const projCmp = (projectById.get(a.projectId) ?? a.projectId).localeCompare(
        projectById.get(b.projectId) ?? b.projectId,
      );
      if (projCmp !== 0) return projCmp;
      return a.tradePackage.localeCompare(b.tradePackage);
    });
  }, [bids, projectById]);

  const lowestPriceByGroup = useMemo(() => {
    const result = new Map<string, string>();
    for (const g of groups) {
      const completed = g.items.filter(
        (b) => b.extractionStatus === 'COMPLETE' && b.extractedData,
      );
      if (completed.length === 0) continue;
      const lowest = completed.reduce(
        (acc, b) =>
          !acc || b.extractedData!.total_price < acc.extractedData!.total_price
            ? b
            : acc,
        null as Bid | null,
      );
      if (lowest) result.set(`${g.projectId}::${g.tradePackage}`, lowest.id);
    }
    return result;
  }, [groups]);

  const handleDelete = async (bid: Bid) => {
    if (!confirm(`Delete the bid from ${bid.extractedData?.contractor ?? bid.tradePackage}?`)) return;
    try {
      await deleteBid.mutateAsync(bid.id);
      enqueueSnackbar('Bid deleted.', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to delete bid.', {
        variant: 'error',
      });
    }
  };

  const startUpload = () => {
    if (!uploadProjectId) {
      enqueueSnackbar('Pick a project first.', { variant: 'warning' });
      return;
    }
    router.push(`${projectRouteBase}/${uploadProjectId}/bids`);
  };

  return (
    <Stack spacing={3}>
      {canCreate && (
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            Upload bids for project:
          </Typography>
          <TextField
            select
            size="small"
            value={uploadProjectId}
            onChange={(e) => setUploadProjectId(e.target.value)}
            sx={{ minWidth: 240, flexGrow: 1, maxWidth: 360 }}
            disabled={projects.length === 0}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <AppButton variant="contained" onClick={startUpload} disabled={!uploadProjectId}>
            Open uploader
          </AppButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          select
          label="Project filter"
          size="small"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">All projects</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {isLoading && <Skeleton variant="rounded" height={240} />}
      {isError && <AppErrorState onRetry={refetch} />}

      {!isLoading && !isError && groups.length === 0 && (
        <AppEmptyState
          title="No bids yet"
          description={
            canCreate
              ? 'Pick a project above and open the uploader to add your first bids.'
              : 'No bids have been uploaded yet.'
          }
        />
      )}

      {groups.map((group) => {
        const groupKey = `${group.projectId}::${group.tradePackage}`;
        const projectName = projectById.get(group.projectId) ?? group.projectId;
        const lowestId = lowestPriceByGroup.get(groupKey);
        return (
          <Box key={groupKey}>
            <Stack
              direction="row"
              alignItems="baseline"
              justifyContent="space-between"
              mb={1.5}
              flexWrap="wrap"
              gap={1}
            >
              <Box>
                <Typography variant="h6" fontWeight={700} m={0}>
                  {group.tradePackage}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {projectName} &middot; {group.items.length} bid
                  {group.items.length === 1 ? '' : 's'}
                </Typography>
              </Box>
              <AppButton
                variant="text"
                component={Link}
                href={`${projectRouteBase}/${group.projectId}/bids`}
                endIcon={<OpenInNewIcon fontSize="small" />}
                size="small"
              >
                Open project bids
              </AppButton>
            </Stack>

            <BidComparisonTable bids={group.items} />

            <Grid container spacing={2} mt={0.5}>
              {group.items.map((bid) => (
                <Grid item xs={12} md={6} key={bid.id}>
                  <BidCard
                    bid={bid}
                    isLowestPrice={lowestId === bid.id}
                    canDelete={canDelete}
                    onDelete={handleDelete}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}

      {!canCreate && (
        <Alert severity="info">
          You can view existing bid analyses but you don&apos;t have permission to upload new ones.
        </Alert>
      )}
    </Stack>
  );
}
