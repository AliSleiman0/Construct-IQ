import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AiFeatureGuard } from '../../common/guards/ai-feature.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireAiFeature } from '../../common/decorators/require-ai-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { AI_FEATURES } from '../../common/constants/ai-features';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { ReportSummaryAgent } from './agents/report-summary.agent';
import { AiQueryDto } from './dto/ai-query.dto';

@ApiTags('AI')
@ApiCookieAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard, AiFeatureGuard)
export class AiController {
  constructor(
    private orchestrator: OrchestratorService,
    private reportSummaryAgent: ReportSummaryAgent,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.AI.USE)
  @RequireAiFeature(AI_FEATURES.AI_ASSISTANT.key)
  @ApiOperation({ summary: 'Send a message to the AI orchestrator' })
  chat(@CurrentUser() user: JwtPayload, @Body() dto: AiQueryDto) {
    return this.orchestrator.route(dto.message, {
      userId: user.sub,
      organizationId: user.organizationId,
      sessionId: dto.sessionId,
      projectId: dto.projectId,
    });
  }

  @Post('summarize-report/:reportId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.AI.USE)
  @RequireAiFeature(AI_FEATURES.AI_REPORT_SUMMARY.key)
  @ApiOperation({ summary: 'Generate and save an AI summary for a daily report' })
  summarizeReport(@Param('reportId') reportId: string) {
    return this.reportSummaryAgent.summarize(reportId).then((summary) => ({ summary }));
  }
}
