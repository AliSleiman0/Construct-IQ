import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectStatus } from '../../common/enums';

export interface ProjectListResponse {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  location: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  totalBudget: number | null;
  currency: string;
  organizationId: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { members: number; tasks: number; issues: number };
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private toProjectListItem(
    p: any,
    counts: { members: number; tasks: number; issues: number },
  ): ProjectListResponse {
    return {
      id: p._id,
      name: p.name,
      description: p.description,
      code: p.code,
      location: p.location,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      totalBudget: p.totalBudget,
      currency: p.currency,
      organizationId: p.organizationId,
      createdById: p.createdById,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      _count: counts,
    };
  }

  async create(
    organizationId: string,
    createdById: string,
    dto: CreateProjectDto,
  ) {
    const project = await this.projectModel.create({
      organizationId,
      createdById,
      name: dto.name,
      description: dto.description ?? null,
      code: dto.code ?? null,
      location: dto.location ?? null,
      status: dto.status ?? ProjectStatus.PLANNING,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      totalBudget: dto.totalBudget ?? null,
      currency: dto.currency ?? 'USD',
      members: [],
    });

    return this.toProjectListItem(project.toObject(), {
      members: 0,
      tasks: 0,
      issues: 0,
    });
  }

  async findAll(
    organizationId: string,
    userId: string,
    isSuperAdmin: boolean,
  ): Promise<ProjectListResponse[]> {
    const filter = isSuperAdmin
      ? {}
      : { organizationId, 'members.userId': userId };

    const projects = await this.projectModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Tasks/issues counts are placeholder zeroes until those modules ship.
    return projects.map((p) =>
      this.toProjectListItem(p, {
        members: (p.members ?? []).length,
        tasks: 0,
        issues: 0,
      }),
    );
  }

  async findById(
    id: string,
    organizationId: string,
    userId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin
      ? { _id: id }
      : { _id: id, organizationId };

    const project = await this.projectModel.findOne(filter).lean();
    if (!project) throw new NotFoundException('Project not found');

    if (!isSuperAdmin) {
      const isMember = (project.members ?? []).some(
        (m) => m.userId === userId,
      );
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this project');
      }
    }

    // Hydrate user details for the project members. Embedded sub-docs only
    // store userId; the API response includes the user's name/email/avatar.
    const memberUserIds = (project.members ?? []).map((m) => m.userId);
    const users = memberUserIds.length
      ? await this.userModel
          .find(
            { _id: { $in: memberUserIds } },
            { _id: 1, firstName: 1, lastName: 1, email: 1, avatarUrl: 1 },
          )
          .lean()
      : [];
    const userById = new Map(users.map((u) => [u._id, u]));

    return {
      ...this.toProjectListItem(project, {
        members: (project.members ?? []).length,
        tasks: 0,
        issues: 0,
      }),
      members: (project.members ?? []).map((m) => {
        const u = userById.get(m.userId);
        return {
          id: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: u
            ? {
                id: u._id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                avatarUrl: u.avatarUrl,
              }
            : null,
        };
      }),
      // phases — schema-only translation; no Phase service yet, return empty.
      phases: [] as Array<{
        id: string;
        name: string;
        order: number;
        status: ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
      }>,
    };
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateProjectDto,
    isSuperAdmin = false,
  ) {
    const filter = isSuperAdmin
      ? { _id: id }
      : { _id: id, organizationId };

    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description ?? null;
    if (dto.code !== undefined) project.code = dto.code ?? null;
    if (dto.location !== undefined) project.location = dto.location ?? null;
    if (dto.status !== undefined) project.status = dto.status;
    if (dto.startDate !== undefined)
      project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      project.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.totalBudget !== undefined)
      project.totalBudget = dto.totalBudget ?? null;
    if (dto.currency !== undefined) project.currency = dto.currency ?? 'USD';

    await project.save();

    return this.toProjectListItem(project.toObject(), {
      members: project.members.length,
      tasks: 0,
      issues: 0,
    });
  }

  async addMember(
    projectId: string,
    organizationId: string,
    dto: AddProjectMemberDto,
  ) {
    const project = await this.projectModel.findOne({
      _id: projectId,
      organizationId,
    });
    if (!project) throw new NotFoundException('Project not found');

    const user = await this.userModel
      .findOne({ _id: dto.userId, organizationId })
      .lean();
    if (!user) {
      throw new NotFoundException('User not found in this organization');
    }

    if (project.members.some((m) => m.userId === dto.userId)) {
      throw new ConflictException('User is already a member of this project');
    }

    project.members.push({
      userId: dto.userId,
      role: dto.role ?? null,
      joinedAt: new Date(),
    } as any);
    await project.save();

    const member = project.members[project.members.length - 1];
    return {
      id: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  }

  async removeMember(
    projectId: string,
    organizationId: string,
    userId: string,
  ) {
    const project = await this.projectModel.findOne({
      _id: projectId,
      organizationId,
    });
    if (!project) throw new NotFoundException('Project not found');

    const idx = project.members.findIndex((m) => m.userId === userId);
    if (idx === -1) {
      throw new NotFoundException('User is not a member of this project');
    }

    project.members.splice(idx, 1);
    await project.save();

    return { message: 'Member removed successfully' };
  }

  async softDelete(
    id: string,
    organizationId: string,
    isSuperAdmin = false,
  ) {
    const filter = isSuperAdmin
      ? { _id: id }
      : { _id: id, organizationId };

    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    await this.projectModel.updateOne(
      { _id: id },
      { deletedAt: new Date() },
    );

    return { message: 'Project deleted successfully' };
  }
}
