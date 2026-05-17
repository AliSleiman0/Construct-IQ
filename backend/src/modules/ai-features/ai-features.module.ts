import { Module } from '@nestjs/common';
import { AiFeaturesController } from './ai-features.controller';
import { AiFeaturesService } from './ai-features.service';

@Module({
  controllers: [AiFeaturesController],
  providers: [AiFeaturesService],
  exports: [AiFeaturesService],
})
export class AiFeaturesModule {}
