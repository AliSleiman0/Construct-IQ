import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { navigationTools, resolveNavigationRoute } from '../tools/navigation.tools';
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

  async handle(message: string, history: ChatHistoryMessage[] = []): Promise<AgentReply> {
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
            'Use conversation history to resolve ambiguous references like "and now the users page".',
        },
        ...history,
        { role: 'user', content: message },
      ],
      tools: navigationTools,
      tool_choice: 'auto',
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.type === 'function') {
      const input = JSON.parse(toolCall.function.arguments) as Record<string, string>;
      const route = resolveNavigationRoute(toolCall.function.name, input);
      return {
        reply: `Taking you to ${route}.`,
        action: { type: 'navigate', route },
      };
    }

    return {
      reply: response.choices[0]?.message?.content ?? 'I could not determine where to navigate.',
    };
  }
}
