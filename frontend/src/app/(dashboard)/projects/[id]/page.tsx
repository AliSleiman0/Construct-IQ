'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Stack, Typography, Tabs, Tab, Avatar,
  Divider, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge';
import { EditProjectModal } from '@/features/projects/components/ProjectModals';
import { TaskTable } from '@/features/tasks/components/TaskTable';
import { CreateTaskModal, EditTaskModal } from '@/features/tasks/components/TaskModals';
import { IssueTable } from '@/features/issues/components/IssueTable';
import { CreateIssueModal, EditIssueModal } from '@/features/issues/components/IssueModals';
import { ReportList } from '@/features/reports/components/ReportList';
import { CreateReportModal, EditReportModal } from '@/features/reports/components/ReportModals';
import { useProject } from '@/features/projects/hooks/useProjects';
import { useProjectEditController } from '@/features/projects/hooks/useProjectEditController';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/features/tasks/hooks/useTaskMutations';
import { useIssues } from '@/features/issues/hooks/useIssues';
import { useCreateIssue, useUpdateIssue, useDeleteIssue } from '@/features/issues/hooks/useIssueMutations';
import { useReports } from '@/features/reports/hooks/useReports';
import { useCreateReport, useUpdateReport } from '@/features/reports/hooks/useReportMutations';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants/routes';
import type { Task } from '@/types/task.types';
import type { Issue } from '@/types/issue.types';
import type { DailyReport } from '@/types/report.types';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return <Box hidden={value !== index} sx={{ pt: 3 }}>{value === index && children}</Box>;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canEditProject = isSuperAdmin || hasPermission('update:projects');
  const canCreateTask = isSuperAdmin || hasPermission('create:tasks');
  const canCreateIssue = isSuperAdmin || hasPermission('create:issues');
  const canCreateReport = isSuperAdmin || hasPermission('create:reports');

  const [tab, setTab] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Project
  const { data: project, isLoading: projectLoading, isError: projectError, refetch: refetchProject } = useProject(projectId);
  const { editProject, openEdit, closeEdit, handleUpdate: handleUpdateProject, isUpdating: isUpdatingProject, updateError } = useProjectEditController();

  // Tasks
  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks({ projectId });
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Issues
  const { data: issues, isLoading: issuesLoading, isError: issuesError, refetch: refetchIssues } = useIssues(projectId);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<Issue | null>(null);
  const createIssueMutation = useCreateIssue(projectId);
  const updateIssueMutation = useUpdateIssue(projectId);
  const deleteIssueMutation = useDeleteIssue(projectId);

  // Reports
  const { data: reports, isLoading: reportsLoading, isError: reportsError, refetch: refetchReports } = useReports(projectId);
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [editReport, setEditReport] = useState<DailyReport | null>(null);
  const createReportMutation = useCreateReport(projectId);
  const updateReportMutation = useUpdateReport(projectId);

  // Handlers
  const handleCreateTask = async (values: any) => {
    setFormError(null);
    try { await createTaskMutation.mutateAsync(values); setCreateTaskOpen(false); }
    catch (e: any) { setFormError(e?.response?.data?.message ?? 'Failed to create task'); }
  };
  const handleUpdateTask = async (values: any) => {
    setFormError(null);
    try { await updateTaskMutation.mutateAsync({ id: editTask!.id, payload: values }); setEditTask(null); }
    catch (e: any) { setFormError(e?.response?.data?.message ?? 'Failed to update task'); }
  };
  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await deleteTaskMutation.mutateAsync(task.id);
  };

  const handleCreateIssue = async (values: any) => {
    setFormError(null);
    try { await createIssueMutation.mutateAsync(values); setCreateIssueOpen(false); }
    catch (e: any) { setFormError(e?.response?.data?.message ?? 'Failed to create issue'); }
  };
  const handleUpdateIssue = async (values: any) => {
    setFormError(null);
    try { await updateIssueMutation.mutateAsync({ id: editIssue!.id, payload: values }); setEditIssue(null); }
    catch (e: any) { setFormError(e?.response?.data?.message ?? 'Failed to update issue'); }
  };
  const handleDeleteIssue = async (issue: Issue) => {
    if (!confirm(`Delete issue "${issue.title}"?`)) return;
    await deleteIssueMutation.mutateAsync(issue.id);
  };

  const handleCreateReport = async (values: any) => {
    setFormError(null);
    try { await createReportMutation.mutateAsync(values); setCreateReportOpen(false); }
    catch (e: any) { setFormError(e?.response?.data?.message ?? 'Failed to create report'); }
  };
  const handleUpdateReport = async (values: any) => {
    setFormError(null);
    try { await updateReportMutation.mutateAsync({ id: editReport!.id, payload: values }); setEditReport(null); }
    catch (e: any) { setFormError(e?.response?.data?.message ?? 'Failed to update report'); }
  };

  if (projectLoading) return <AppLoader />;
  if (projectError || !project) return <AppErrorState onRetry={refetchProject} />;

  return (
    <Box>
      <PageHeader
        title={project.name}
        breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: project.name }]}
        actions={
          <Stack direction="row" spacing={1}>
            <AppButton variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push(ROUTES.PROJECTS)}>
              Back
            </AppButton>
            {canEditProject && (
              <AppButton variant="contained" startIcon={<EditIcon />} onClick={() => openEdit(project)}>
                Edit
              </AppButton>
            )}
          </Stack>
        }
      />

      {/* Summary bar */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
        <ProjectStatusBadge status={project.status} />
        {project.location && <Typography variant="body2" color="text.secondary">📍 {project.location}</Typography>}
        {project.code && <Chip label={`#${project.code}`} size="small" variant="outlined" />}
        {project.startDate && (
          <Typography variant="body2" color="text.secondary">
            {new Date(project.startDate).toLocaleDateString()} – {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
          </Typography>
        )}
        {project.totalBudget && (
          <Typography variant="body2" color="text.secondary">
            {project.currency} {project.totalBudget.toLocaleString()}
          </Typography>
        )}
      </Stack>

      {/* Counts summary */}
      <Stack direction="row" spacing={2} mb={3}>
        {[
          { label: 'Members', value: project._count.members },
          { label: 'Tasks', value: project._count.tasks },
          { label: 'Issues', value: project._count.issues },
        ].map((stat) => (
          <Box key={stat.label} sx={{ px: 2.5, py: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
            <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
          </Box>
        ))}
      </Stack>

      <Divider />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tab label={`Tasks (${tasks?.length ?? 0})`} />
        <Tab label={`Issues (${issues?.length ?? 0})`} />
        <Tab label={`Members (${project.members?.length ?? project._count.members})`} />
        <Tab label={`Reports (${reports?.length ?? 0})`} />
      </Tabs>

      {/* Tasks Tab */}
      <TabPanel value={tab} index={0}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          {canCreateTask && (
            <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => { setFormError(null); setCreateTaskOpen(true); }}>
              Add Task
            </AppButton>
          )}
        </Stack>
        {tasksLoading && <AppLoader />}
        {tasksError && <AppErrorState onRetry={refetchTasks} />}
        {!tasksLoading && !tasksError && (tasks?.length ?? 0) === 0 && (
          <AppEmptyState title="No tasks yet" description="Add tasks to track project progress." />
        )}
        {!tasksLoading && !tasksError && (tasks?.length ?? 0) > 0 && (
          <TaskTable tasks={tasks!} onEdit={(t) => { setFormError(null); setEditTask(t); }} onDelete={handleDeleteTask} />
        )}
      </TabPanel>

      {/* Issues Tab */}
      <TabPanel value={tab} index={1}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          {canCreateIssue && (
            <AppButton variant="contained" startIcon={<AddIcon />} color="warning" onClick={() => { setFormError(null); setCreateIssueOpen(true); }}>
              Report Issue
            </AppButton>
          )}
        </Stack>
        {issuesLoading && <AppLoader />}
        {issuesError && <AppErrorState onRetry={refetchIssues} />}
        {!issuesLoading && !issuesError && (issues?.length ?? 0) === 0 && (
          <AppEmptyState title="No issues reported" description="Issues and blockers reported on this project will appear here." />
        )}
        {!issuesLoading && !issuesError && (issues?.length ?? 0) > 0 && (
          <IssueTable issues={issues!} onEdit={(i) => { setFormError(null); setEditIssue(i); }} onDelete={handleDeleteIssue} />
        )}
      </TabPanel>

      {/* Members Tab */}
      <TabPanel value={tab} index={2}>
        {(project.members?.length ?? 0) === 0 ? (
          <AppEmptyState title="No members" description="Members of this project will appear here." />
        ) : (
          <Stack spacing={1.5}>
            {project.members?.map((member) => (
              <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Avatar src={member.user.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
                  {member.user.firstName[0]}{member.user.lastName[0]}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={500}>{member.user.firstName} {member.user.lastName}</Typography>
                  <Typography variant="caption" color="text.secondary">{member.user.email}</Typography>
                </Box>
                {member.role && <Chip label={member.role} size="small" variant="outlined" />}
              </Box>
            ))}
          </Stack>
        )}
      </TabPanel>

      {/* Reports Tab */}
      <TabPanel value={tab} index={3}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          {canCreateReport && (
            <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => { setFormError(null); setCreateReportOpen(true); }}>
              New Report
            </AppButton>
          )}
        </Stack>
        {reportsLoading && <AppLoader />}
        {reportsError && <AppErrorState onRetry={refetchReports} />}
        {!reportsLoading && !reportsError && (reports?.length ?? 0) === 0 && (
          <AppEmptyState title="No reports yet" description="Daily reports for this project will appear here." />
        )}
        {!reportsLoading && !reportsError && (reports?.length ?? 0) > 0 && (
          <ReportList reports={reports!} onEdit={(r) => { setFormError(null); setEditReport(r); }} />
        )}
      </TabPanel>

      {/* Modals */}
      <EditProjectModal open={!!editProject} project={editProject} isLoading={isUpdatingProject} error={updateError} onClose={closeEdit} onSubmit={handleUpdateProject} />
      <CreateTaskModal open={createTaskOpen} isLoading={createTaskMutation.isPending} error={formError} onClose={() => setCreateTaskOpen(false)} onSubmit={handleCreateTask} />
      <EditTaskModal open={!!editTask} task={editTask} isLoading={updateTaskMutation.isPending} error={formError} onClose={() => setEditTask(null)} onSubmit={handleUpdateTask} />
      <CreateIssueModal open={createIssueOpen} isLoading={createIssueMutation.isPending} error={formError} onClose={() => setCreateIssueOpen(false)} onSubmit={handleCreateIssue} />
      <EditIssueModal open={!!editIssue} issue={editIssue} isLoading={updateIssueMutation.isPending} error={formError} onClose={() => setEditIssue(null)} onSubmit={handleUpdateIssue} />
      <CreateReportModal open={createReportOpen} isLoading={createReportMutation.isPending} error={formError} onClose={() => setCreateReportOpen(false)} onSubmit={handleCreateReport} />
      <EditReportModal open={!!editReport} report={editReport} isLoading={updateReportMutation.isPending} error={formError} onClose={() => setEditReport(null)} onSubmit={handleUpdateReport} />
    </Box>
  );
}
