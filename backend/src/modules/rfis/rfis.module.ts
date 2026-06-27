import { Module } from '@nestjs/common';
import { RfisController } from './rfis.controller';
import { RfisService } from './rfis.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [RfisController],
  providers: [RfisService],
  exports: [RfisService],
})
export class RfisModule {}
