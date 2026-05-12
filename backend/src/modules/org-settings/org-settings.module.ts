import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { OrgSettingsController } from './org-settings.controller';
import { OrgSettingsService } from './org-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrgSettingsController],
  providers: [OrgSettingsService],
  exports: [OrgSettingsService],
})
export class OrgSettingsModule {}
