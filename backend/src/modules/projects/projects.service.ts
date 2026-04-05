import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  code: true,
  location: true,
  status: true,
  startDate: true,
  endDate: true,
  totalBudget: true,
  currency: true,
  organizationId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { members: true, tasks: true, issues: true },
  },
} as const;

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createdById: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        organizationId,
        createdById,
        name: dto.name,
        description: dto.description,
        code: dto.code,
        location: dto.location,
        status: dto.status ?? 'PLANNING',
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        totalBudget: dto.totalBudget,
        currency: dto.currency ?? 'USD',
      },
      select: PROJECT_SELECT,
    });
  }

  async findAll(organizationId: string, userId: string, isSuperAdmin: boolean) {
    // Super Admin sees all projects across all organizations
    // Org Admin / PM see all projects in their org
    // Others see only projects they are members of
    const where = isSuperAdmin
      ? { deletedAt: null }
      : { organizationId, deletedAt: null, members: { some: { userId } } };

    return this.prisma.project.findMany({
      where,
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string, userId: string, isSuperAdmin: boolean) {
    // Super Admin can access any project across any org
    const whereClause = isSuperAdmin
      ? { id, deletedAt: null }
      : { id, organizationId, deletedAt: null };

    const project = await this.prisma.project.findFirst({
      where: whereClause,
      select: {
        ...PROJECT_SELECT,
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
        phases: {
          select: { id: true, name: true, order: true, status: true, startDate: true, endDate: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check membership only for non-Super-Admin non-manager users
    if (!isSuperAdmin) {
      const isMember = project.members.some((m) => m.user.id === userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this project');
      }
    }

    return project;
  }

  async update(id: string, organizationId: string, dto: UpdateProjectDto, isSuperAdmin = false) {
    const project = await this.prisma.project.findFirst({
      where: isSuperAdmin ? { id, deletedAt: null } : { id, organizationId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      select: PROJECT_SELECT,
    });
  }

  async addMember(projectId: string, organizationId: string, dto: AddProjectMemberDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in this organization');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    return this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, role: dto.role },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async removeMember(projectId: string, organizationId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      throw new NotFoundException('User is not a member of this project');
    }

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    return { message: 'Member removed successfully' };
  }

  async softDelete(id: string, organizationId: string, isSuperAdmin = false) {
    const project = await this.prisma.project.findFirst({
      where: isSuperAdmin ? { id, deletedAt: null } : { id, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Project deleted successfully' };
  }
}
