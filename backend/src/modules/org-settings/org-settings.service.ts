import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

@Injectable()
export class OrgSettingsService {
  constructor(private prisma: PrismaService) {}

  /** Returns org settings, creating defaults if none exist. */
  async get(organizationId: string) {
    const existing = await this.prisma.orgSettings.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;

    return this.prisma.orgSettings.create({
      data: { organizationId },
    });
  }

  async update(organizationId: string, dto: UpdateOrgSettingsDto) {
    const existing = await this.prisma.orgSettings.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return this.prisma.orgSettings.update({
        where: { organizationId },
        data: dto,
      });
    }

    return this.prisma.orgSettings.create({
      data: { organizationId, ...dto },
    });
  }
}
