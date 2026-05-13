import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { NavigationAgent } from '../agents/navigation.agent';
import { ReportSummaryAgent } from '../agents/report-summary.agent';
import { ChatSessionService } from '../chat/chat-session.service';
import { AiResponseDto } from '../dto/ai-response.dto';

type AgentName = 'navigation' | 'report-summary' | 'unknown';

interface OrchestratorDecision {
  agent: AgentName;
  payload: Record<string, string>;
}

export interface OrchestratorContext {
  userId: string;
  organizationId: string;
  sessionId?: string;
  projectId?: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly client: OpenAI;

  constructor(
    private configService: ConfigService,
    private navigationAgent: NavigationAgent,
    private reportSummaryAgent: ReportSummaryAgent,
    private chatSessionService: ChatSessionService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });
  }

  async route(message: string, context: OrchestratorContext): Promise<AiResponseDto> {
    const session = await this.chatSessionService.getOrCreate(
      context.userId,
      context.organizationId,
      context.sessionId,
    );

    await this.chatSessionService.appendMessage(session.id, 'user', message, context.userId);

    const history = await this.chatSessionService.loadHistory(session.id);

    const model = this.configService.get<string>('ai.model') ?? 'gpt-4o-mini';

    const classifyResponse = await this.client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a router for ConstructIQ. Classify the user's intent and return ONLY valid JSON.

Agents available:
- "navigation": user wants to go to a section or page (dashboard, users, projects, reports, budget)
- "report-summary": user wants to summarize a daily report (requires reportId in payload)
- "unknown": intent is unclear

Return format: {"agent": "<name>", "payload": {}}
For report-summary, include the reportId in payload if mentioned.
Use conversation history to resolve follow-up intents.`,
        },
        ...history.slice(0, -1),
        { role: 'user', content: message },
      ],
      max_tokens: 128,
    });

    let decision: OrchestratorDecision = { agent: 'unknown', payload: {} };

    try {
      const raw = classifyResponse.choices[0]?.message?.content ?? '{}';
      decision = JSON.parse(raw) as OrchestratorDecision;
    } catch {
      this.logger.warn('Orchestrator failed to parse classification JSON');
    }

    let replyText: string;
    let action: AiResponseDto['action'];

    switch (decision.agent) {
      case 'navigation': {
        const result = await this.navigationAgent.handle(message, history.slice(0, -1));
        replyText = result.reply;
        action = result.action;
        break;
      }

      case 'report-summary': {
        const reportId = decision.payload?.reportId ?? context.projectId;
        if (!reportId) throw new BadRequestException('reportId is required for report summarization');
        replyText = await this.reportSummaryAgent.summarize(reportId);
        break;
      }

      default:
        replyText =
          "I'm not sure how to help with that yet. Try asking me to navigate somewhere or summarize a report.";
    }

    await this.chatSessionService.appendMessage(
      session.id,
      'assistant',
      replyText,
      undefined,
      action ? { action, agent: decision.agent } : { agent: decision.agent },
    );

    return { reply: replyText, action, sessionId: session.id };
  }
}
