import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { NavigationAgent } from '../agents/navigation.agent';
import { ReportSummaryAgent } from '../agents/report-summary.agent';
import { ChatSessionService } from '../chat/chat-session.service';
import { AiResponseDto } from '../dto/ai-response.dto';
import {
  AiCapability,
  isAllowedCapability,
  resolveCapabilities,
} from '../capabilities/ai-capabilities';
import {
  NavigationScope,
  describeDestinations,
  resolveNavigationScope,
} from '../tools/navigation-catalog';

interface OrchestratorDecision {
  agent: string;
  payload: Record<string, string>;
}

export interface OrchestratorContext {
  userId: string;
  organizationId: string;
  isSuperAdmin?: boolean;
  sessionId?: string;
  projectId?: string;
  /** Resolved by PermissionsGuard — drives every scoping decision below. */
  permissions?: string[];
  /** Resolved by PermissionsGuard — picks the caller's route prefix. */
  roles?: string[];
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
    const permissions = context.permissions ?? [];
    const roles = context.roles ?? [];

    // Per-user scope. Everything below is derived from these two values: the
    // model is only told about capabilities/destinations the caller has, and
    // its answer is re-checked against them before anything is dispatched.
    const capabilities = resolveCapabilities(permissions);
    const navScope = resolveNavigationScope(roles, permissions);

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
          content: this.buildClassifierPrompt(capabilities, navScope),
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

    // Enforcement point. The prompt above only *suggests* the caller's scope;
    // this check is what actually holds. A classification naming an agent the
    // caller may not use is never dispatched, however it got there.
    if (!isAllowedCapability(capabilities, decision.agent)) {
      if (
        decision.agent &&
        decision.agent !== 'unknown' &&
        decision.agent !== 'out-of-scope'
      ) {
        this.logger.warn(
          `Blocked out-of-scope AI agent "${decision.agent}" for user ${context.userId}`,
        );
      }
      replyText = this.buildRefusal(decision.agent, navScope);
      await this.persistReply(session.id, replyText, decision.agent);
      return { reply: replyText, sessionId: session.id };
    }

    switch (decision.agent) {
      case 'navigation': {
        const result = await this.navigationAgent.handle(
          message,
          navScope,
          history.slice(0, -1),
        );
        replyText = result.reply;
        action = result.action;
        break;
      }

      case 'report-summary': {
        const reportId = decision.payload?.reportId;
        if (!reportId) {
          // Deliberately do NOT fall back to context.projectId — a project id
          // is not a report id and would always 404. Ask instead.
          replyText =
            'Which daily report would you like me to summarize? Open the report and try again, or give me its ID.';
          break;
        }
        replyText = await this.reportSummaryAgent.summarize(
          reportId,
          context.organizationId,
          context.isSuperAdmin ?? false,
        );
        break;
      }

      default:
        // Unreachable — the allow-check above returns for anything not in the
        // switch. Kept so `replyText` is definitely assigned.
        replyText = this.buildRefusal(decision.agent, navScope);
    }

    await this.persistReply(session.id, replyText, decision.agent, action);

    return { reply: replyText, action, sessionId: session.id };
  }

  /**
   * The classifier only ever sees the caller's own capabilities — an agent the
   * caller cannot use is not described, so it cannot be picked in the first
   * place. `out-of-scope` gives the model a way to say "that's beyond this
   * user" instead of guessing.
   */
  private buildClassifierPrompt(
    capabilities: AiCapability[],
    scope: NavigationScope,
  ): string {
    const sections = describeDestinations(scope);

    return [
      "You are a router for ConstructIQ. Classify the user's intent and return ONLY valid JSON.",
      '',
      'Agents available to THIS user:',
      ...capabilities.map((c) => `- ${c.promptLine}`),
      '- "out-of-scope": the request is about an area of the app this user does not work with',
      '- "unknown": intent is unclear',
      '',
      sections
        ? `Sections this user can reach: ${sections}.`
        : 'This user has no navigable sections.',
      'Anything outside those areas — or any agent not listed above — must be classified as "out-of-scope". Never invent an agent name.',
      '',
      'Return format: {"agent": "<name>", "payload": {}}',
      // Only mention an agent's payload contract when the caller actually has
      // it — otherwise this line reintroduces the name we just withheld.
      ...(capabilities.some((c) => c.key === 'report-summary')
        ? ['For report-summary, include the reportId in payload if mentioned.']
        : []),
      'Use conversation history to resolve follow-up intents.',
    ].join('\n');
  }

  /**
   * Refusal that tells the user what they *can* do, in their own terms.
   * `unknown` means the model could not read the intent — that's a "rephrase"
   * situation. Anything else that reaches here (an out-of-scope area, or an
   * agent name the caller may not use) is an access boundary, and should be
   * named as one so the user isn't left thinking the assistant is broken.
   */
  private buildRefusal(agent: string, scope: NavigationScope): string {
    const sections = describeDestinations(scope);
    const help = sections ? ` I can help you with: ${sections}.` : '';

    if (!agent || agent === 'unknown') {
      return `I'm not sure how to help with that yet.${help}`;
    }

    return `That isn't part of what I can help with for your role.${help}`;
  }

  private persistReply(
    sessionId: string,
    reply: string,
    agent: string,
    action?: AiResponseDto['action'],
  ): Promise<unknown> {
    return this.chatSessionService.appendMessage(
      sessionId,
      'assistant',
      reply,
      undefined,
      action ? { action, agent } : { agent },
    );
  }
}
