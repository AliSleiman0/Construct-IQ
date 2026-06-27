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

@Module({
  imports: [AuditModule],
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
