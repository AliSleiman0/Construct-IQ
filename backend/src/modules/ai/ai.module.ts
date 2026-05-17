import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { NavigationAgent } from './agents/navigation.agent';
import { ReportSummaryAgent } from './agents/report-summary.agent';
import { ChatSessionService } from './chat/chat-session.service';
import { AiFeatureGuard } from '../../common/guards/ai-feature.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [
    OrchestratorService,
    NavigationAgent,
    ReportSummaryAgent,
    ChatSessionService,
    AiFeatureGuard,
  ],
  exports: [OrchestratorService],
})
export class AiModule {}
