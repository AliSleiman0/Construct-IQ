import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditLogEntry {
  organizationId: string;
  actorUserId?: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.auditLogModel.create({
      organizationId: entry.organizationId,
      actorUserId: entry.actorUserId ?? null,
      projectId: entry.projectId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  }

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    filters: {
      actorUserId?: string;
      entityType?: string;
      from?: string;
      to?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<any> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };

    if (filters.actorUserId) filter.actorUserId = filters.actorUserId;
    if (filters.entityType) filter.entityType = filters.entityType;
    if (filters.from || filters.to) {
      filter.createdAt = {
        ...(filters.from ? { $gte: new Date(filters.from) } : {}),
        ...(filters.to ? { $lte: new Date(filters.to) } : {}),
      };
    }

    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = filters.skip ?? 0;

    const [items, total] = await Promise.all([
      this.auditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return { items, total, limit, skip };
  }
}
