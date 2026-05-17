import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrgSettings, OrgSettingsDocument } from './schemas/org-settings.schema';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { AuditService } from '../audit/audit.service';

// `ip-range-check` is published as `export =`, so use require-style interop.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipRangeCheck: (
  addr: string,
  range: string | string[],
) => boolean = require('ip-range-check');

export interface UpdateContext {
  actorUserId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class OrgSettingsService {
  constructor(
    @InjectModel(OrgSettings.name)
    private orgSettingsModel: Model<OrgSettingsDocument>,
    private readonly auditService: AuditService,
  ) {}

  async get(organizationId: string): Promise<any> {
    const existing = await this.orgSettingsModel.findOne({ organizationId }).lean();
    if (existing) return existing;

    return this.orgSettingsModel.create({ organizationId });
  }

  async update(
    organizationId: string,
    dto: UpdateOrgSettingsDto,
    context?: UpdateContext,
  ): Promise<any> {
    // Pre-fetch so we can diff for the audit row and run policy checks.
    const before = await this.orgSettingsModel.findOne({ organizationId }).lean();

    // Self-lockout protection: refuse if the new allowedIps would block the
    // caller's own IP. Empty array always passes (clears allowlist).
    if (Array.isArray(dto.allowedIps) && dto.allowedIps.length > 0) {
      const callerIp = this.normalizeIp(context?.ipAddress ?? null);
      if (callerIp && !ipRangeCheck(callerIp, dto.allowedIps)) {
        throw new BadRequestException(
          'Your current IP would be blocked by this allowlist. Add your IP or a covering CIDR range, or leave the list empty.',
        );
      }
    }

    const after = await this.orgSettingsModel
      .findOneAndUpdate(
        { organizationId },
        { $set: dto },
        { new: true, upsert: true },
      )
      .lean();

    // Audit. Diff before/after over only the keys the caller submitted.
    if (context?.actorUserId && after) {
      const changedFields = Object.keys(dto).filter((key) => {
        const k = key as keyof UpdateOrgSettingsDto;
        return (
          JSON.stringify((before as any)?.[k]) !==
          JSON.stringify((after as any)?.[k])
        );
      });

      if (changedFields.length > 0) {
        const beforeSnapshot: Record<string, unknown> = {};
        const afterSnapshot: Record<string, unknown> = {};
        for (const k of changedFields) {
          beforeSnapshot[k] = (before as any)?.[k] ?? null;
          afterSnapshot[k] = (after as any)?.[k] ?? null;
        }

        // Fire-and-forget: an audit failure must not surface to the user.
        this.auditService
          .log({
            organizationId,
            actorUserId: context.actorUserId,
            action: 'UPDATE',
            entityType: 'ORG_SETTINGS',
            entityId: (after as any)._id,
            metadata: {
              changedFields,
              before: beforeSnapshot,
              after: afterSnapshot,
            },
            ipAddress: context.ipAddress ?? undefined,
            userAgent: context.userAgent ?? undefined,
          })
          .catch(() => {
            // Intentionally swallowed.
          });
      }
    }

    return after;
  }

  private normalizeIp(ip: string | null): string | null {
    if (!ip) return null;
    if (ip.startsWith('::ffff:')) return ip.slice('::ffff:'.length);
    return ip;
  }
}
