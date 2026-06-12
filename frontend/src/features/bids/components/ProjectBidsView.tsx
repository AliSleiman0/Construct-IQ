'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/store/auth.store';
import { BidUploadPanel } from './BidUploadPanel';
import { BidCard } from './BidCard';
import { BidComparisonTable } from './BidComparisonTable';
import { useBids, useDeleteBid } from '../hooks/useBids';
import type { Bid } from '@/types/bids.types';

interface ProjectBidsViewProps {
  projectId: string;
  /** Where the role's project list lives, e.g. "/pm/projects" — used for breadcrumbs. */
  projectRouteBase: string;
  /** Override the back-link target (defaults to `${projectRouteBase}/${projectId}`). */
  backHref?: string;
  /** Optional override for the back-link label. */
  backLabel?: string;
}

export function ProjectBidsView({
  projectId,
  projectRouteBase,
  backHref,
  backLabel = 'Back to project',
}: ProjectBidsViewProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const can = (p: string) => isSuperAdmin || hasPermission(p);

  const canRead = can('read:bids');
  const canCreate = can('create:bids');
  const canDelete = can('delete:bids');

  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, isError, refetch } = useBids({ projectId });
  const deleteBid = useDeleteBid();

  const bids = data ?? [];

  const groups = useMemo(() => {
    const map = new Map<string, Bid[]>();
    for (const b of bids) {
      if (filter && !b.tradePackage.toLowerCase().includes(filter.toLowerCase())) continue;
      const existing = map.get(b.tradePackage) ?? [];
      existing.push(b);
      map.set(b.tradePackage, existing);
    }
    return Array.from(map.entries())
      .map(([tradePackage, items]) => ({
        tradePackage,
        items: items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      }))
      .sort((a, b) => a.tradePackage.localeCompare(b.tradePackage));
  }, [bids, filter]);

  const lowestPriceIdsByPackage = useMemo(() => {
    const result = new Map<string, string>();
    for (const group of groups) {
      const completed = group.items.filter(
        (b) => b.extractionStatus === 'COMPLETE' && b.extractedData,
      );
      if (completed.length === 0) continue;
      const lowest = completed.reduce(
        (acc, b) =>
          !acc || b.extractedData!.total_price < acc.extractedData!.total_price ? b : acc,
        null as Bid | null,
      );
      if (lowest) result.set(group.tradePackage, lowest.id);
    }
    return result;
  }, [groups]);

  const handleDelete = async (bid: Bid) => {
    if (
      !confirm(
        `Delete the bid from ${bid.extractedData?.contractor ?? bid.tradePackage}?`,
      )
    )
      return;
    try {
      await deleteBid.mutateAsync(bid.id);
      enqueueSnackbar('Bid deleted.', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to delete bid.', {
        variant: 'error',
      });
    }
  };

  if (!canRead) {
    return (
      <Box>
        <PageHeader
          title="Bid analyzer"
          breadcrumbs={[
            { label: 'Projects', href: projectRouteBase },
            { label: projectId, href: `${projectRouteBase}/${projectId}` },
            { label: 'Bids' },
          ]}
        />
        <Alert severity="warning">
          You do not have permission to view subcontractor bids on this project.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Subcontractor bid analyzer"
        subtitle="Upload bid PDFs for a trade package and compare them side-by-side."
        breadcrumbs={[
          { label: 'Projects', href: projectRouteBase },
          { label: projectId, href: `${projectRouteBase}/${projectId}` },
          { label: 'Bids' },
        ]}
        actions={
          <Button
            component={Link}
            href={backHref ?? `${projectRouteBase}/${projectId}`}
            startIcon={<ArrowBackIcon />}
            variant="text"
          >
            {backLabel}
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Upload" disabled={!canCreate} />
        <Tab label={`Results${bids.length > 0 ? ` (${bids.length})` : ''}`} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={3}>
          {!canCreate && (
            <Alert severity="info">
              You can view existing bids but you don&apos;t have permission to upload new ones.
            </Alert>
          )}
          {canCreate && (
            <BidUploadPanel projectId={projectId} onUploaded={() => setTab(1)} />
          )}
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={3}>
          <TextField
            label="Filter by trade package"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            size="small"
            sx={{ maxWidth: 320 }}
          />

          {isLoading && <Skeleton variant="rounded" height={240} />}
          {isError && <AppErrorState onRetry={refetch} />}

          {!isLoading && !isError && groups.length === 0 && (
            <AppEmptyState
              title="No bids yet"
              description="Upload PDF bids for this project to see them analyzed and compared here."
              action={
                canCreate ? (
                  <AppButton variant="contained" onClick={() => setTab(0)}>
                    Upload bids
                  </AppButton>
                ) : undefined
              }
            />
          )}

          {groups.map((group) => (
            <Box key={group.tradePackage}>
              <Box
                display="flex"
                alignItems="baseline"
                justifyContent="space-between"
                mb={1.5}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {group.tradePackage}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.items.length} bid{group.items.length === 1 ? '' : 's'}
                  </Typography>
                </Box>
              </Box>

              <BidComparisonTable bids={group.items} />

              <Grid container spacing={2} mt={0.5}>
                {group.items.map((bid) => (
                  <Grid item xs={12} md={6} key={bid.id}>
                    <BidCard
                      bid={bid}
                      isLowestPrice={
                        lowestPriceIdsByPackage.get(group.tradePackage) === bid.id
                      }
                      canDelete={canDelete}
                      onDelete={handleDelete}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
