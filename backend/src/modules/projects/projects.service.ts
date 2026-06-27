import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { cascadeSoftDelete } from '../../database/mongoose/cascade.util';
import { Project, ProjectDocument } from './schemas/project.schema';
import { Task, TaskDocument } from './schemas/task.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Issue, IssueDocument } from '../issues/schemas/issue.schema';
import { DocumentEntity, DocumentEntityDocument } from '../documents/schemas/document.schema';
import { CadDrawing, CadDrawingDocument } from './schemas/cad-drawing.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { IssueStatus, ProjectStatus, DocumentType } from '../../common/enums';
import { ApsService } from '../aps/aps.service';

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
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentEntityDocument>,
    @InjectModel(CadDrawing.name) private cadDrawingModel: Model<CadDrawingDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly apsService: ApsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Fire-and-forget audit write — a logging failure must never break the op. */
  private audit(entry: Parameters<AuditService['log']>[0]): void {
    this.auditService.log(entry).catch(() => undefined);
  }

  /** Fire-and-forget notification fan-out — a delivery failure must never break the op. */
  private notify(
    organizationId: string,
    userIds: (string | null | undefined)[],
    payload: Parameters<NotificationsService['notifyMany']>[2],
  ): void {
    this.notificationsService.notifyMany(organizationId, userIds, payload).catch(() => undefined);
  }

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
      members: [{ userId: createdById, role: 'Admin', joinedAt: new Date() }],
      clientPortalToken: randomBytes(32).toString('hex'),
      clientPortalEnabled: true,
      autocadToken: randomBytes(32).toString('hex'),
      autocadTokenEnabled: true,
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

    if (projects.length === 0) return [];

    const projectIds = projects.map((p) => p._id);

    const [taskCounts, issueCounts] = await Promise.all([
      this.taskModel.aggregate([
        { $match: { projectId: { $in: projectIds }, deletedAt: null } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } },
      ]),
      this.issueModel.aggregate([
        { $match: { projectId: { $in: projectIds }, deletedAt: null } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } },
      ]),
    ]);

    const tasksByProject = new Map(taskCounts.map((r: any) => [r._id, r.count]));
    const issuesByProject = new Map(issueCounts.map((r: any) => [r._id, r.count]));

    return projects.map((p) =>
      this.toProjectListItem(p, {
        members: (p.members ?? []).length,
        tasks: tasksByProject.get(p._id) ?? 0,
        issues: issuesByProject.get(p._id) ?? 0,
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

    const [taskCount, issueCount] = await Promise.all([
      this.taskModel.countDocuments({ projectId: project._id, deletedAt: null }),
      this.issueModel.countDocuments({ projectId: project._id, deletedAt: null }),
    ]);

    return {
      ...this.toProjectListItem(project, {
        members: (project.members ?? []).length,
        tasks: taskCount,
        issues: issueCount,
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
    actorUserId?: string,
  ) {
    const filter = isSuperAdmin
      ? { _id: id }
      : { _id: id, organizationId };

    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    const prevStatus = project.status;

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

    // Project status transitions are team-significant: audit + notify members.
    if (dto.status !== undefined && dto.status !== prevStatus) {
      this.audit({
        organizationId: project.organizationId,
        actorUserId,
        projectId: id,
        action: 'UPDATE',
        entityType: 'PROJECT',
        entityId: id,
        metadata: { field: 'status', from: prevStatus, to: project.status },
      });
      const members = project.members.map((m: any) => m.userId).filter(Boolean);
      this.notify(project.organizationId, members.filter((u: string) => u !== actorUserId), {
        title: 'Project status changed',
        message: `"${project.name}" moved to ${project.status}.`,
        type: 'info',
        entityType: 'PROJECT',
        entityId: id,
      });
    }

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

  async updateMember(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: UpdateProjectMemberDto,
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

    project.members[idx].role = dto.role ?? null;
    await project.save();

    const member = project.members[idx];
    const user = await this.userModel
      .findOne({ _id: userId })
      .select('firstName lastName email avatarUrl')
      .lean();
    return {
      id: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: user
        ? {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
          }
        : null,
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

    if (project.members.length <= 1) {
      throw new BadRequestException(
        'Cannot remove the last member of a project',
      );
    }

    project.members.splice(idx, 1);
    await project.save();

    return { message: 'Member removed successfully' };
  }

  async softDelete(
    id: string,
    organizationId: string,
    isSuperAdmin = false,
    actorUserId?: string,
  ) {
    const filter = isSuperAdmin
      ? { _id: id }
      : { _id: id, organizationId };

    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    const now = new Date();
    await this.projectModel.updateOne({ _id: id }, { deletedAt: now });

    // Cascade soft-delete to every child entity scoped to this project (tasks,
    // issues, units, phases, milestones, valuations, variations, POs, budget…).
    const cascade = await cascadeSoftDelete(this.connection, 'projectId', id, now);

    this.audit({
      organizationId: project.organizationId,
      actorUserId,
      projectId: id,
      action: 'DELETE',
      entityType: 'PROJECT',
      entityId: id,
      metadata: { cascade },
    });

    return { message: 'Project deleted successfully' };
  }

  // ── Client Portal ─────────────────────────────────────────────────────────

  async getClientPortalInfo(
    projectId: string,
    organizationId: string,
    userId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin
      ? { _id: projectId }
      : { _id: projectId, organizationId };

    const project = await this.projectModel.findOne(filter).lean();
    if (!project) throw new NotFoundException('Project not found');

    if (!isSuperAdmin) {
      const isMember = (project.members ?? []).some((m) => m.userId === userId);
      if (!isMember) throw new ForbiddenException('You are not a member of this project');
    }

    return {
      token: project.clientPortalToken,
      enabled: project.clientPortalEnabled,
    };
  }

  async regenerateClientPortalToken(
    projectId: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin
      ? { _id: projectId }
      : { _id: projectId, organizationId };

    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    project.clientPortalToken = randomBytes(32).toString('hex');
    await project.save();

    return { token: project.clientPortalToken, enabled: project.clientPortalEnabled };
  }

  async toggleClientPortal(
    projectId: string,
    organizationId: string,
    enabled: boolean,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin
      ? { _id: projectId }
      : { _id: projectId, organizationId };

    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    project.clientPortalEnabled = enabled;
    await project.save();

    return { token: project.clientPortalToken, enabled: project.clientPortalEnabled };
  }

  /** Public — no auth. Called by the client-facing portal page. */
  async getClientPortalData(token: string) {
    const project = await this.projectModel
      .findOne({ clientPortalToken: token, deletedAt: null })
      .lean();

    if (!project) throw new NotFoundException('Portal link not found');
    if (!project.clientPortalEnabled) throw new GoneException('This portal link has been disabled');

    const memberUserIds = (project.members ?? []).map((m) => m.userId);
    const [users, tasks, issues] = await Promise.all([
      memberUserIds.length
        ? this.userModel
            .find({ _id: { $in: memberUserIds } }, { _id: 1, firstName: 1, lastName: 1 })
            .lean()
        : [],
      this.taskModel
        .find(
          { projectId: project._id, deletedAt: null },
          { _id: 1, title: 1, status: 1, priority: 1, startDate: 1, dueDate: 1, completedAt: 1, progress: 1 },
        )
        .sort({ position: 1, createdAt: -1 })
        .lean(),
      this.issueModel
        .find(
          { projectId: project._id, deletedAt: null },
          { _id: 1, title: 1, type: 1, severity: 1, status: 1 },
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const userById = new Map((users as any[]).map((u) => [String(u._id), u]));

    const tasksByStatus: Record<string, number> = {};
    for (const t of tasks as any[]) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
    }

    const issuesBySeverity: Record<string, number> = {};
    let openIssues = 0;
    let resolvedIssues = 0;
    for (const i of issues as any[]) {
      issuesBySeverity[i.severity] = (issuesBySeverity[i.severity] ?? 0) + 1;
      if (i.status === IssueStatus.RESOLVED || i.status === IssueStatus.CLOSED) {
        resolvedIssues++;
      } else {
        openIssues++;
      }
    }

    const team = (project.members ?? []).map((m) => {
      const u = userById.get(m.userId);
      const displayName = u ? `${u.firstName} ${u.lastName.charAt(0)}.` : 'Team Member';
      return { displayName, role: m.role };
    });

    return {
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
        code: project.code,
        location: project.location,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      tasks: {
        total: (tasks as any[]).length,
        byStatus: tasksByStatus,
        items: (tasks as any[]).map((t) => ({
          id: String(t._id),
          title: t.title,
          status: t.status,
          priority: t.priority,
          startDate: t.startDate ?? null,
          dueDate: t.dueDate ?? null,
          completedAt: t.completedAt ?? null,
          progress: t.progress ?? 0,
        })),
      },
      issues: {
        total: (issues as any[]).length,
        open: openIssues,
        resolved: resolvedIssues,
        bySeverity: issuesBySeverity,
        items: (issues as any[]).map((i) => ({
          id: String(i._id),
          title: i.title,
          type: i.type,
          severity: i.severity,
          status: i.status,
        })),
      },
      team,
    };
  }

  // ── AutoCAD Engineer Portal ───────────────────────────────────────────────

  async getAutocadLinkInfo(
    projectId: string,
    organizationId: string,
    userId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: projectId } : { _id: projectId, organizationId };
    const project = await this.projectModel.findOne(filter).lean();
    if (!project) throw new NotFoundException('Project not found');

    if (!isSuperAdmin) {
      const isMember = (project.members ?? []).some((m) => m.userId === userId);
      if (!isMember) throw new ForbiddenException('You are not a member of this project');
    }

    return {
      token: project.autocadToken,
      enabled: project.autocadTokenEnabled,
      apsConfigured: this.apsService.isConfigured(),
    };
  }

  async regenerateAutocadToken(
    projectId: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: projectId } : { _id: projectId, organizationId };
    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    project.autocadToken = randomBytes(32).toString('hex');
    await project.save();

    return { token: project.autocadToken, enabled: project.autocadTokenEnabled };
  }

  async toggleAutocadLink(
    projectId: string,
    organizationId: string,
    enabled: boolean,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: projectId } : { _id: projectId, organizationId };
    const project = await this.projectModel.findOne(filter);
    if (!project) throw new NotFoundException('Project not found');

    project.autocadTokenEnabled = enabled;
    await project.save();

    return { token: project.autocadToken, enabled: project.autocadTokenEnabled };
  }

  /** Public — no auth. Returns project info + uploaded drawings. */
  async getAutocadPortalData(token: string) {
    const project = await this.projectModel
      .findOne({ autocadToken: token, deletedAt: null })
      .lean();

    if (!project) throw new NotFoundException('AutoCAD portal link not found');
    if (!project.autocadTokenEnabled) {
      throw new GoneException('This AutoCAD portal link has been disabled');
    }

    const drawings = await this.documentModel
      .find({
        projectId: project._id,
        type: DocumentType.DRAWING,
        'metadata.source': 'autocad-portal',
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .lean();

    return {
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
        code: project.code,
        location: project.location,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      drawings: drawings.map((d) => ({
        id: String(d._id),
        name: d.name,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        uploadedAt: d.createdAt,
        apsUrn: (d.metadata as any)?.apsUrn ?? null,
        translationStatus: (d.metadata as any)?.translationStatus ?? 'pending',
      })),
      apsConfigured: this.apsService.isConfigured(),
    };
  }

  /** Public — no auth. Called after engineer uploads a file via the portal. */
  async saveAutocadDrawing(
    token: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
  ) {
    const project = await this.projectModel
      .findOne({ autocadToken: token, deletedAt: null })
      .lean();

    if (!project) throw new NotFoundException('AutoCAD portal link not found');
    if (!project.autocadTokenEnabled) {
      throw new GoneException('This AutoCAD portal link has been disabled');
    }

    const objectKey = `${project._id}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    let apsUrn: string | null = null;
    let translationStatus = 'not_configured';

    if (this.apsService.isConfigured()) {
      try {
        const result = await this.apsService.uploadToOss(objectKey, file.buffer, file.mimetype);
        apsUrn = result.urn;
        translationStatus = 'pending';
        // Fire-and-forget — translation is async; status polled separately
        this.apsService.triggerTranslation(result.urn).catch(() => {});
      } catch {
        translationStatus = 'upload_failed';
      }
    }

    const doc = await this.documentModel.create({
      organizationId: project.organizationId,
      projectId: project._id,
      type: DocumentType.DRAWING,
      name: file.originalname,
      fileKey: objectKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: null,
      metadata: {
        source: 'autocad-portal',
        apsUrn,
        translationStatus,
      },
    });

    return {
      id: String(doc._id),
      name: doc.name,
      apsUrn,
      translationStatus,
      uploadedAt: doc.createdAt,
    };
  }

  // ── CAD Drawing (canvas JSON) ─────────────────────────────────────────────

  async loadCadDrawing(token: string) {
    const project = await this.projectModel
      .findOne({ autocadToken: token, deletedAt: null })
      .lean();
    if (!project) throw new NotFoundException('AutoCAD portal link not found');
    if (!project.autocadTokenEnabled) throw new GoneException('This portal link has been disabled');

    const drawing = await this.cadDrawingModel
      .findOne({ projectId: project._id })
      .lean();

    return {
      project: { name: project.name, description: project.description, status: project.status },
      canvasJson: drawing?.canvasJson ?? null,
      version: drawing?.version ?? 0,
    };
  }

  async saveCadDrawing(token: string, canvasJson: string) {
    const project = await this.projectModel
      .findOne({ autocadToken: token, deletedAt: null })
      .lean();
    if (!project) throw new NotFoundException('AutoCAD portal link not found');
    if (!project.autocadTokenEnabled) throw new GoneException('This portal link has been disabled');

    await this.cadDrawingModel.findOneAndUpdate(
      { projectId: project._id },
      {
        $set: { canvasJson, organizationId: project.organizationId },
        $inc: { version: 1 },
      },
      { upsert: true, new: true },
    );

    return { saved: true };
  }

  /** Public — polls APS for the current translation status and updates the stored record. */
  async refreshDrawingTranslationStatus(token: string, drawingId: string) {
    const project = await this.projectModel
      .findOne({ autocadToken: token, deletedAt: null })
      .lean();

    if (!project) throw new NotFoundException('AutoCAD portal link not found');

    const doc = await this.documentModel.findOne({
      _id: drawingId,
      projectId: project._id,
      deletedAt: null,
    });
    if (!doc) throw new NotFoundException('Drawing not found');

    const apsUrn = (doc.metadata as any)?.apsUrn;
    if (!apsUrn || !this.apsService.isConfigured()) {
      return { translationStatus: (doc.metadata as any)?.translationStatus ?? 'not_configured' };
    }

    const { status } = await this.apsService.getManifest(apsUrn);
    const translationStatus =
      status === 'success' ? 'success' :
      status === 'failed'  ? 'failed'  :
      'processing';

    (doc.metadata as any) = { ...(doc.metadata as any), translationStatus };
    doc.markModified('metadata');
    await doc.save();

    return { translationStatus };
  }
}
