import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rfi, RfiDocument } from './schemas/rfi.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRfiDto } from './dto/create-rfi.dto';
import { UpdateRfiDto } from './dto/update-rfi.dto';
import { AnswerRfiDto } from './dto/answer-rfi.dto';
import { RfiStatus, RfiDiscipline } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { assertStatusTransition, TransitionMap } from '../../common/util/status-transition.util';

// Self-service RFI transitions. ANSWERED is dedicated-only (answer() stamps
// answeredById/At) — it can't be reached through the generic update.
const RFI_TRANSITIONS: TransitionMap<RfiStatus> = {
  [RfiStatus.OPEN]: [RfiStatus.CLOSED],
  [RfiStatus.ANSWERED]: [RfiStatus.CLOSED, RfiStatus.OPEN],
  [RfiStatus.CLOSED]: [RfiStatus.OPEN],
};

export interface RfiListParams {
  projectId?: string;
  status?: RfiStatus;
  discipline?: string;
}

/** Who is asking — when orgWide is false, results are limited to member projects. */
export interface RfiViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class RfisService {
  constructor(
    @InjectModel(Rfi.name) private rfiModel: Model<RfiDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
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

  private static readonly POPULATE = [
    { path: 'projectId', select: 'name' },
    { path: 'respondentId', select: 'firstName lastName' },
    { path: 'createdById', select: 'firstName lastName' },
    { path: 'answeredById', select: 'firstName lastName' },
  ];

  private flattenUser(u: any): { id: string; firstName: string; lastName: string } | null {
    if (!u || typeof u !== 'object') return null;
    return { id: u._id, firstName: u.firstName, lastName: u.lastName };
  }

  /** Flatten populated refs into id + name objects (mirrors InspectionsService.mapInspection). */
  private mapRfi(doc: any): any {
    if (!doc) return doc;
    const respondent = this.flattenUser(doc.respondentId);
    const createdBy = this.flattenUser(doc.createdById);
    const answeredBy = this.flattenUser(doc.answeredById);
    const project =
      doc.projectId && typeof doc.projectId === 'object'
        ? { id: doc.projectId._id, name: doc.projectId.name }
        : null;
    return {
      ...doc,
      id: doc._id,
      projectId: project?.id ?? (typeof doc.projectId === 'string' ? doc.projectId : null),
      respondentId: respondent?.id ?? (typeof doc.respondentId === 'string' ? doc.respondentId : null),
      createdById: createdBy?.id ?? (typeof doc.createdById === 'string' ? doc.createdById : null),
      answeredById: answeredBy?.id ?? (typeof doc.answeredById === 'string' ? doc.answeredById : null),
      project,
      respondent,
      createdBy,
      answeredBy,
    };
  }

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    params: RfiListParams = {},
    viewer?: RfiViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (params.projectId) filter.projectId = params.projectId;
    if (params.status) filter.status = params.status;
    if (params.discipline) filter.discipline = params.discipline;

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const restrictIds = await this.memberProjectIds(organizationId, viewer.userId);
      if (restrictIds.length === 0) return [];
      filter.projectId =
        params.projectId && restrictIds.includes(params.projectId)
          ? params.projectId
          : params.projectId
            ? { $in: [] }
            : { $in: restrictIds };
    }

    const docs = await this.rfiModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate(RfisService.POPULATE)
      .lean();
    return docs.map((d) => this.mapRfi(d));
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.rfiModel.findOne(filter).populate(RfisService.POPULATE).lean();
    if (!doc) throw new NotFoundException('RFI not found');
    return this.mapRfi(doc);
  }

  /**
   * Per-org sequential RFI number (RFI-0001…). Count-based: adequate for v1; a
   * concurrent-safe atomic counter is future hardening.
   */
  private async nextNumber(organizationId: string): Promise<string> {
    const count = await this.rfiModel.countDocuments({ organizationId });
    return `RFI-${String(count + 1).padStart(4, '0')}`;
  }

  async create(organizationId: string, createdById: string, dto: CreateRfiDto): Promise<any> {
    const created = await this.rfiModel.create({
      organizationId,
      createdById,
      projectId: dto.projectId,
      number: await this.nextNumber(organizationId),
      subject: dto.subject,
      question: dto.question,
      discipline: dto.discipline ?? RfiDiscipline.GENERAL,
      status: RfiStatus.OPEN,
      respondentId: dto.respondentId ?? null,
      dueBy: dto.dueBy ? new Date(dto.dueBy) : null,
    });
    return this.findById(created._id, organizationId, false);
  }

  async update(id: string, organizationId: string, dto: UpdateRfiDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.rfiModel.findOne(filter);
    if (!doc) throw new NotFoundException('RFI not found');

    if (dto.subject !== undefined) doc.subject = dto.subject;
    if (dto.question !== undefined) doc.question = dto.question;
    if (dto.discipline !== undefined) doc.discipline = dto.discipline;
    if (dto.respondentId !== undefined) doc.respondentId = dto.respondentId ?? null;
    if (dto.dueBy !== undefined) doc.dueBy = dto.dueBy ? new Date(dto.dueBy) : null;
    if (dto.status !== undefined) {
      // ANSWERED goes through the dedicated answer() endpoint only — guard the rest.
      assertStatusTransition('RFI', doc.status, dto.status, RFI_TRANSITIONS);
      doc.status = dto.status;
    }

    await doc.save();
    return this.findById(id, organizationId, isSuperAdmin);
  }

  /** Manager answers the RFI: records the answer + who answered + when, status→ANSWERED. */
  async answer(id: string, user: JwtPayload, dto: AnswerRfiDto): Promise<any> {
    const filter = user.isSuperAdmin ? { _id: id } : { _id: id, organizationId: user.organizationId };
    const doc = await this.rfiModel.findOne(filter);
    if (!doc) throw new NotFoundException('RFI not found');

    doc.answer = dto.answer;
    doc.answeredById = user.sub;
    doc.answeredAt = new Date();
    doc.status = RfiStatus.ANSWERED;

    await doc.save();

    this.audit({
      organizationId: doc.organizationId,
      actorUserId: user.sub,
      projectId: doc.projectId,
      action: 'ANSWER',
      entityType: 'RFI',
      entityId: doc._id,
      metadata: { to: RfiStatus.ANSWERED },
    });
    this.notify(doc.organizationId, [doc.createdById].filter((u) => u !== user.sub), {
      title: 'RFI answered',
      message: `Your RFI "${doc.subject}" was answered.`,
      type: 'success',
      entityType: 'RFI',
      entityId: doc._id,
    });
    return this.findById(id, user.organizationId, user.isSuperAdmin);
  }

  async softDelete(id: string, organizationId: string, isSuperAdmin: boolean): Promise<{ message: string }> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.rfiModel.findOne(filter);
    if (!doc) throw new NotFoundException('RFI not found');
    await this.rfiModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'RFI deleted successfully' };
  }
}
