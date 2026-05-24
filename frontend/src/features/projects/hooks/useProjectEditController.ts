import { useState } from 'react';
import { useUpdateProject } from './useProjectMutations';
import type { Project } from '@/types/project.types';

/**
 * Shared controller for the "edit a project" flow — used by the PM + admin
 * project lists and the project-detail pages, all of which drive the same
 * EditProjectModal. Owns the selected project, its update mutation, and a
 * scoped error so callers don't re-implement the boilerplate.
 *
 * List pages: `onEdit={openEdit}` per row. Detail pages: `onClick={() => openEdit(project)}`.
 * Modal: `open={!!editProject} project={editProject} onClose={closeEdit} onSubmit={handleUpdate}`.
 */
export function useProjectEditController() {
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const mutation = useUpdateProject(editProject?.id ?? '');

  const openEdit = (project: Project) => {
    setUpdateError(null);
    setEditProject(project);
  };
  const closeEdit = () => setEditProject(null);

  const handleUpdate = async (values: any) => {
    setUpdateError(null);
    try {
      await mutation.mutateAsync(values);
      setEditProject(null);
    } catch (e: any) {
      setUpdateError(e?.response?.data?.message ?? 'Failed to update project');
    }
  };

  return { editProject, openEdit, closeEdit, handleUpdate, isUpdating: mutation.isPending, updateError };
}
