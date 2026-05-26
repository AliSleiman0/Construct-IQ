import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyReport, DailyReportDocument } from './schemas/daily-report.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';

/**
 * Who is asking. When `orgWide` is false the caller only sees reports for the
 * projects they belong to (field roles); when true they see the whole org.
 */
export interface ReportViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(DailyReport.name)
    private reportModel: Model<DailyReportDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  private static readonly POPULATE = [
    { path: 'createdById', select: 'firstName lastName' },
    { path: 'projectId', select: 'name' },
  ];

  private flattenUser(
    u: any,
  ): { id: string; firstName: string; lastName: string } | null {
    if (!u || typeof u !== 'object') return null;
    return { id: u._id, firstName: u.firstName, lastName: u.lastName };
  }

  /**
   * Flattens a populated, lean DailyReport into the shape the frontend expects:
   * keeps the raw id fields and adds `createdBy` + `project` objects (mirrors
   * IssuesService.mapIssue). Mongoose `populate` replaces the ref field with the
   * joined doc, so we read the id back off `_id`.
   */
  private mapReport(doc: any): any {
    if (!doc) return doc;
    const createdBy = this.flattenUser(doc.createdById);
    const project =
      doc.projectId && typeof doc.projectId === 'object'
        ? { id: doc.projectId._id, name: doc.projectId.name }
        : null;

    return {
      ...doc,
      id: doc._id,
      createdById: createdBy?.id ?? (typeof doc.createdById === 'string' ? doc.createdById : null),
      projectId: project?.id ?? (typeof doc.projectId === 'string' ? doc.projectId : doc.projectId),
      createdBy,
      project,
    };
  }

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    viewer?: ReportViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const restrictIds = await this.memberProjectIds(organizationId, viewer.userId);
      if (restrictIds.length === 0) return [];
      // Honour an explicit project filter only if the caller is a member.
      filter.projectId =
        projectId && restrictIds.includes(projectId)
          ? projectId
          : projectId
            ? { $in: [] }
            : { $in: restrictIds };
    }

    const docs = await this.reportModel
      .find(filter)
      .sort({ reportDate: -1 })
      .populate(ReportsService.POPULATE)
      .lean();
    return docs.map((d) => this.mapReport(d));
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const report = await this.reportModel
      .findOne(filter)
      .populate(ReportsService.POPULATE)
      .lean();
    if (!report) throw new NotFoundException('Daily report not found');
    return this.mapReport(report);
  }

  async create(
    organizationId: string,
    createdById: string,
    dto: CreateDailyReportDto,
  ): Promise<any> {
    const existing = await this.reportModel.findOne({
      projectId: dto.projectId,
      reportDate: new Date(dto.reportDate),
    });
    if (existing) {
      throw new ConflictException(
        'A report for this project on that date already exists',
      );
    }

    return this.reportModel.create({
      organizationId,
      createdById,
      projectId: dto.projectId,
      reportDate: new Date(dto.reportDate),
      weather: dto.weather ?? null,
      highTempC: dto.highTempC ?? null,
      lowTempC: dto.lowTempC ?? null,
      workCompleted: dto.workCompleted ?? null,
      blockers: dto.blockers ?? null,
      notes: dto.notes ?? null,
      manpowerEntries: dto.manpowerEntries ?? [],
      materialEntries: dto.materialEntries ?? [],
      equipmentEntries: dto.equipmentEntries ?? [],
    });
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateDailyReportDto,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const report = await this.reportModel.findOne(filter);
    if (!report) throw new NotFoundException('Daily report not found');

    if (!isSuperAdmin && report.createdById !== userId) {
      throw new ForbiddenException('Only the report author can edit this report');
    }

    if (dto.weather !== undefined) report.weather = dto.weather ?? null;
    if (dto.highTempC !== undefined) report.highTempC = dto.highTempC ?? null;
    if (dto.lowTempC !== undefined) report.lowTempC = dto.lowTempC ?? null;
    if (dto.workCompleted !== undefined) report.workCompleted = dto.workCompleted ?? null;
    if (dto.blockers !== undefined) report.blockers = dto.blockers ?? null;
    if (dto.notes !== undefined) report.notes = dto.notes ?? null;
    if (dto.manpowerEntries !== undefined) report.manpowerEntries = dto.manpowerEntries as any;
    if (dto.materialEntries !== undefined) report.materialEntries = dto.materialEntries as any;
    if (dto.equipmentEntries !== undefined) report.equipmentEntries = dto.equipmentEntries as any;

    await report.save();
    return this.findById(id, organizationId, isSuperAdmin);
  }
}
