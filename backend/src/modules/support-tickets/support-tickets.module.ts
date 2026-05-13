import { Module } from '@nestjs/common';
import { SupportTicketsController } from './support-tickets.controller';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [SupportTicketsController],
})
export class SupportTicketsModule {}
