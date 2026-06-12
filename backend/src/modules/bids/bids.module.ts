import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [AiModule, DocumentsModule],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
