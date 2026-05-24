'use client';

import { useEffect, useState } from 'react';
import { Box, Pagination, Stack, Typography, CircularProgress } from '@mui/material';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useAuthStore } from '@/store/auth.store';
import { useDebounce } from '@/hooks/useDebounce';
import { useIssuesPaged, useIssueSummary } from '../hooks/useIssues';
import type { IssueListParams } from '@/types/issue.types';
import { IssueFiltersBar, type QuickFilter } from './IssueFiltersBar';
import { IssueTriageTable } from './IssueTriageTable';
import { IssueCardList } from './IssueCardList';
import { IssueBulkBar } from './IssueBulkBar';

const PAGE_SIZE = 25;
const VIEW_KEY = 'pm-issues-view';

/** The org-wide issue triage console: server-paged/sorted/filtered table + cards. */
export function IssuesConsole({ detailBasePath }: { detailBasePath: string }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canManage = isSuperAdmin || hasPermission('update:issues');

  const [params, setParams] = useState<IssueListParams>({ sort: 'smart', sortDir: 'desc', limit: PAGE_SIZE, skip: 0 });
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounce(searchText, 300);
  const [quick, setQuick] = useState<QuickFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_KEY) : null;
    if (v === 'cards' || v === 'table') setView(v);
  }, []);
  const changeView = (v: 'table' | 'cards') => {
    setView(v);
    window.localStorage.setItem(VIEW_KEY, v);
  };

  // Debounced search → params (resetting to the first page).
  useEffect(() => {
    setParams((p) => ({ ...p, search: debounced || undefined, skip: 0 }));
  }, [debounced]);

  const patch = (p: Partial<IssueListParams>) => {
    setParams((cur) => ({ ...cur, ...p, skip: 0 }));
    setSelected(new Set());
    setQuick('all');
  };

  const applyQuick = (q: QuickFilter) => {
    setQuick(q);
    setSelected(new Set());
    setParams((cur) => {
      const base: IssueListParams = { ...cur, skip: 0, severity: undefined, status: undefined, assignedToId: undefined };
      if (q === 'openCriticals') return { ...base, severity: 'CRITICAL', status: 'OPEN' };
      if (q === 'unassigned') return { ...base, assignedToId: 'NONE' };
      return base;
    });
  };

  const onSort = (key: string) => {
    setParams((cur) => {
      if (cur.sort === key) return { ...cur, sortDir: cur.sortDir === 'asc' ? 'desc' : 'asc' };
      return { ...cur, sort: key, sortDir: key === 'createdAt' ? 'asc' : 'desc' };
    });
  };

  const { data, isLoading, isError, refetch } = useIssuesPaged(params);
  const { data: summary } = useIssueSummary(params.projectId ? { projectId: params.projectId } : undefined);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = params.limit ?? PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor((params.skip ?? 0) / limit) + 1;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = (ids: string[], select: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (select ? n.add(id) : n.delete(id)));
      return n;
    });

  return (
    <Box>
      <IssueFiltersBar
        params={params}
        searchText={searchText}
        onSearch={setSearchText}
        onPatch={patch}
        summary={summary}
        active={quick}
        onQuick={applyQuick}
        view={view}
        onView={changeView}
      />

      {canManage && selected.size > 0 && (
        <IssueBulkBar ids={Array.from(selected)} onDone={() => setSelected(new Set())} />
      )}

      {isError ? (
        <AppErrorState onRetry={refetch} />
      ) : isLoading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress size={28} />
        </Stack>
      ) : items.length === 0 ? (
        <Box textAlign="center" py={5}>
          <Typography variant="body2" color="text.secondary">
            No issues match the current filters.
          </Typography>
        </Box>
      ) : view === 'table' ? (
        <IssueTriageTable
          issues={items}
          detailBasePath={detailBasePath}
          sort={params.sort ?? 'smart'}
          sortDir={params.sortDir ?? 'desc'}
          onSort={onSort}
          selectable={canManage}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      ) : (
        <IssueCardList issues={items} detailBasePath={detailBasePath} />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={2}>
          <Typography variant="caption" color="text.secondary">
            {total} issue{total === 1 ? '' : 's'}
          </Typography>
          {pageCount > 1 && (
            <Pagination
              count={pageCount}
              page={page}
              color="primary"
              onChange={(_, v) => {
                setParams((p) => ({ ...p, skip: (v - 1) * (p.limit ?? PAGE_SIZE) }));
                setSelected(new Set());
              }}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}
