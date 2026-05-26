import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inspection, InspectionDocument } from './schemas/inspection.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionStatus } from '../../common/enums';

export interface InspectionListParams {
  projectId?: string;
  status?: InspectionStatus;
  type?: string;
}

/** Who is asking — when orgWide is false, results are limited to member projects. */
export interface InspectionViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class InspectionsService {
  constructor(
    @InjectModel(Inspection.name) private inspectionModel: Model<InspectionDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  private static readonly POPULATE = [
    { path: 'projectId', select: 'name' },
    { path: 'inspectorId', select: 'firstName lastName' },
    { path: 'createdById', select: 'firstName lastName' },
  ];

  private flattenUser(u: any): { id: string; firstName: string; lastName: string } | null {
    if (!u || typeof u !== 'object') return null;
    return { id: u._id, firstName: u.firstName, lastName: u.lastName };
  }

  /** Flatten populated refs into id + name objects (mirrors IssuesService.mapIssue). */
  private mapInspection(doc: any): any {
    if (!doc) return doc;
    const inspector = this.flattenUser(doc.inspectorId);
    const createdBy = this.flattenUser(doc.createdById);
    const project =
      doc.projectId && typeof doc.projectId === 'object'
        ? { id: doc.projectId._id, name: doc.projectId.name }
        : null;
    return {
      ...doc,
      id: doc._id,
      projectId: project?.id ?? (typeof doc.projectId === 'string' ? doc.projectId : null),
      inspectorId: inspector?.id ?? (typeof doc.inspectorId === 'string' ? doc.inspectorId : null),
      createdById: createdBy?.id ?? (typeof doc.createdById === 'string' ? doc.createdById : null),
      project,
      inspector,
      createdBy,
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
    params: InspectionListParams = {},
    viewer?: InspectionViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (params.projectId) filter.projectId = params.projectId;
    if (params.status) filter.status = params.status;
    if (params.type) filter.type = params.type;

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

    const docs = await this.inspectionModel
      .find(filter)
      .sort({ scheduledFor: -1, createdAt: -1 })
      .populate(InspectionsService.POPULATE)
      .lean();
    return docs.map((d) => this.mapInspection(d));
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.inspectionModel.findOne(filter).populate(InspectionsService.POPULATE).lean();
    if (!doc) throw new NotFoundException('Inspection not found');
    return this.mapInspection(doc);
  }

  async create(organizationId: string, createdById: string, dto: CreateInspectionDto): Promise<any> {
    const created = await this.inspectionModel.create({
      organizationId,
      createdById,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      status: dto.status ?? InspectionStatus.SCHEDULED,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      inspectorId: dto.inspectorId ?? null,
      location: dto.location ?? null,
      notes: dto.notes ?? null,
    });
    return this.findById(created._id, organizationId, false);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateInspectionDto,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.inspectionModel.findOne(filter);
    if (!doc) throw new NotFoundException('Inspection not found');

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description ?? null;
    if (dto.type !== undefined) doc.type = dto.type;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.scheduledFor !== undefined) doc.scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    if (dto.inspectorId !== undefined) doc.inspectorId = dto.inspectorId ?? null;
    if (dto.location !== undefined) doc.location = dto.location ?? null;
    if (dto.notes !== undefined) doc.notes = dto.notes ?? null;

    await doc.save();
    return this.findById(id, organizationId, isSuperAdmin);
  }

  async softDelete(id: string, organizationId: string, isSuperAdmin: boolean): Promise<{ message: string }> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.inspectionModel.findOne(filter);
    if (!doc) throw new NotFoundException('Inspection not found');
    await this.inspectionModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Inspection deleted successfully' };
  }
}
