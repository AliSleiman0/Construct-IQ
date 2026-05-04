'use client';
import { Box, Card, CardActionArea, CardContent, Typography, Stack, Divider } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import type { Project } from '@/types/project.types';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { boxShadow: 3 } }}>
      <CardActionArea onClick={() => onClick(project)} sx={{ p: 0 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, mr: 1 }} noWrap>
              {project.name}
            </Typography>
            <ProjectStatusBadge status={project.status} />
          </Stack>

          {project.code && (
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              #{project.code}
            </Typography>
          )}

          {project.location && (
            <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
              <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{project.location}</Typography>
            </Stack>
          )}

          {project.description && (
            <Typography variant="body2" color="text.secondary" mb={1.5} sx={{
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {project.description}
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={2.5}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <GroupIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{project._count.members}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TaskAltIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{project._count.tasks}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ReportProblemIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{project._count.issues}</Typography>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {formatDate(project.startDate)} – {formatDate(project.endDate)}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
