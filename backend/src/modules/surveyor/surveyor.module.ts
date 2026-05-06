import { Module } from '@nestjs/common';
import {
  BoqController,
  VariationsController,
  ValuationsController,
} from './surveyor.controller';
import { SurveyorService } from './surveyor.service';

@Module({
  controllers: [BoqController, VariationsController, ValuationsController],
  providers: [SurveyorService],
  exports: [SurveyorService],
})
export class SurveyorModule {}
