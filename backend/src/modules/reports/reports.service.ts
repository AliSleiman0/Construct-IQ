import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyReport, DailyReportDocument } from './schemas/daily-report.schema';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(DailyReport.name)
    private reportModel: Model<DailyReportDocument>,
  ) {}

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.reportModel.find(filter).sort({ reportDate: -1 }).lean();
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const report = await this.reportModel.findOne(filter).lean();
    if (!report) throw new NotFoundException('Daily report not found');
    return report;
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
    return report.toObject();
  }
}
