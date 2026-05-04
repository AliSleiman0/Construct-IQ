import { Module } from '@nestjs/common';
import {
  UnitsController,
  PaymentsController,
  ProgressPhotosController,
} from './units.controller';
import { UnitsService } from './units.service';

@Module({
  controllers: [UnitsController, PaymentsController, ProgressPhotosController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
