import { Module } from '@nestjs/common';
import { ApsService } from './aps.service';

@Module({
  providers: [ApsService],
  exports: [ApsService],
})
export class ApsModule {}
