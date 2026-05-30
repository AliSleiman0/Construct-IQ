import { Module } from '@nestjs/common';
import {
  ProcurementDashboardController,
  SuppliersController,
  PurchaseOrdersController,
  MaterialRequestsController,
  DeliveriesController,
} from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
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
