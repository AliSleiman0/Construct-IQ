import { Module } from '@nestjs/common';
import {
  SuppliersController,
  PurchaseOrdersController,
  DeliveriesController,
} from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  controllers: [
    SuppliersController,
    PurchaseOrdersController,
    DeliveriesController,
  ],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
