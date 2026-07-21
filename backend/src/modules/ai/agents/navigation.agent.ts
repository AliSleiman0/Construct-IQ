import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  NavigationScope,
  buildNavigationTools,
  describeDestinations,
  resolveNavigationRoute,
} from '../tools/navigation-catalog';
import { AgentReply } from '../dto/ai-response.dto';
import { ChatHistoryMessage } from '../chat/chat-session.service';

@Injectable()
export class NavigationAgent {
  private readonly logger = new Logger(NavigationAgent.name);
  private readonly client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });
  }

  /**
   * `scope` is the caller's resolved navigation scope — the model is only ever
   * offered the destinations it contains, and the tool call it returns is
   * re-validated against the same list before a route is emitted.
   */
  async handle(
    message: string,
    scope: NavigationScope,
    history: ChatHistoryMessage[] = [],
  ): Promise<AgentReply> {
    const tools = buildNavigationTools(scope);

    // No destinations at all (unrecognized role, or every page filtered out) —
    // don't spend a model call to say "no".
    if (tools.length === 0) {
      return {
        reply:
          'There are no sections I can navigate you to with your current access.',
      };
    }

    const model = this.configService.get<string>('ai.model') ?? 'gpt-4o-mini';

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a navigation assistant for ConstructIQ, a construction project management app. ' +
            'When the user asks to go somewhere or open a section, call the appropriate navigation tool. ' +
            'Always use a tool — never reply with plain text alone when navigation is requested. ' +
            `This user can only reach these sections: ${describeDestinations(scope)}. ` +
            'If they ask for anything else, say it is not part of what they can access — do not call a tool. ' +
            'Use conversation history to resolve ambiguous references like "and now the tasks page".',
        },
        ...history,
        { role: 'user', content: message },
      ],
      tools,
      tool_choice: 'auto',
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.type === 'function') {
      let input: Record<string, string> = {};
      try {
        input = JSON.parse(toolCall.function.arguments) as Record<string, string>;
      } catch {
        this.logger.warn('Navigation agent got unparseable tool arguments');
      }

      const target = resolveNavigationRoute(toolCall.function.name, input, scope);

      // The model picked something outside the caller's scope. Refuse rather
      // than navigate — the frontend would bounce them off the route anyway.
      if (!target) {
        this.logger.warn(
          `Navigation agent rejected out-of-scope target: ${toolCall.function.name} ${JSON.stringify(input)}`,
        );
        return {
          reply: `That section isn't available with your access. I can take you to: ${describeDestinations(scope)}.`,
        };
      }

      return {
        reply: `Taking you to ${target.label}.`,
        action: { type: 'navigate', route: target.route },
      };
    }

    return {
      reply:
        response.choices[0]?.message?.content ??
        'I could not determine where to navigate.',
    };
  }
}
