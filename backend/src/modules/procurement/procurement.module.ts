import { Module } from '@nestjs/common';
import {
  ProcurementDashboardController,
  SuppliersController,
  PurchaseOrdersController,
  MaterialRequestsController,
  DeliveriesController,
} from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [
    ProcurementDashboardController,
    SuppliersController,
    PurchaseOrdersController,
    MaterialRequestsController,
    DeliveriesController,
  ],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
