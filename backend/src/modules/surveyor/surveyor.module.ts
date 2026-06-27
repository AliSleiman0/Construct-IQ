import { Module } from '@nestjs/common';
import {
  BoqController,
  VariationsController,
  ValuationsController,
} from './surveyor.controller';
import { SurveyorService } from './surveyor.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [BoqController, VariationsController, ValuationsController],
  providers: [SurveyorService],
  exports: [SurveyorService],
})
export class SurveyorModule {}
