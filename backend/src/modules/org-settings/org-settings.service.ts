import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrgSettings, OrgSettingsDocument } from './schemas/org-settings.schema';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

@Injectable()
export class OrgSettingsService {
  constructor(
    @InjectModel(OrgSettings.name) private orgSettingsModel: Model<OrgSettingsDocument>,
  ) {}

  async get(organizationId: string): Promise<any> {
    const existing = await this.orgSettingsModel.findOne({ organizationId }).lean();
    if (existing) return existing;

    return this.orgSettingsModel.create({ organizationId });
  }

  async update(organizationId: string, dto: UpdateOrgSettingsDto): Promise<any> {
    return this.orgSettingsModel
      .findOneAndUpdate(
        { organizationId },
        { $set: dto },
        { new: true, upsert: true },
      )
      .lean();
  }
}
