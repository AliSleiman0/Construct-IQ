import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

const createCompletion = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createCompletion } },
  })),
}));

import { OrchestratorService, OrchestratorContext } from './orchestrator.service';
import { NavigationAgent } from '../agents/navigation.agent';
import { ReportSummaryAgent } from '../agents/report-summary.agent';
import { ChatSessionService } from '../chat/chat-session.service';

/**
 * Per-user AI scoping. The classifier prompt only *describes* the caller's
 * capabilities — these tests assert the deterministic check that runs after
 * classification, which is what actually holds when the model misbehaves or is
 * talked into naming an agent the caller may not use.
 */
describe('OrchestratorService — per-user capability scoping', () => {
  let service: OrchestratorService;
  let navigationAgent: { handle: jest.Mock };
  let reportSummaryAgent: { summarize: jest.Mock };
  let chatSessionService: {
    getOrCreate: jest.Mock;
    appendMessage: jest.Mock;
    loadHistory: jest.Mock;
  };

  /** Make the classifier return this decision, verbatim. */
  const classifyAs = (decision: unknown) =>
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(decision) } }],
    });

  const systemPrompt = () =>
    createCompletion.mock.calls[0][0].messages[0].content as string;

  // SITE_ENG: reports yes, budget no.
  const siteEng: OrchestratorContext = {
    userId: 'u1',
    organizationId: 'org-A',
    roles: ['SITE_ENG'],
    permissions: ['use:ai', 'read:tasks', 'read:reports', 'read:issues'],
  };

  // PROCUREMENT: no read:reports at all.
  const procurement: OrchestratorContext = {
    userId: 'u2',
    organizationId: 'org-A',
    roles: ['PROCUREMENT'],
    permissions: ['use:ai', 'read:suppliers', 'manage:purchase_orders'],
  };

  beforeEach(async () => {
    createCompletion.mockReset();

    navigationAgent = { handle: jest.fn().mockResolvedValue({ reply: 'navigated' }) };
    reportSummaryAgent = { summarize: jest.fn().mockResolvedValue('a summary') };
    chatSessionService = {
      getOrCreate: jest.fn().mockResolvedValue({ id: 'sess-1' }),
      appendMessage: jest.fn().mockResolvedValue(undefined),
      loadHistory: jest.fn().mockResolvedValue([{ role: 'user', content: 'hi' }]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: NavigationAgent, useValue: navigationAgent },
        { provide: ReportSummaryAgent, useValue: reportSummaryAgent },
        { provide: ChatSessionService, useValue: chatSessionService },
      ],
    }).compile();

    service = moduleRef.get(OrchestratorService);
  });

  describe('enforcement — the model does not get the last word', () => {
    it('refuses report-summary for a caller without read:reports, even when the classifier asks for it', async () => {
      classifyAs({ agent: 'report-summary', payload: { reportId: 'rep-1' } });

      const res = await service.route('summarize report rep-1', procurement);

      // The whole point: the agent is never reached.
      expect(reportSummaryAgent.summarize).not.toHaveBeenCalled();
      expect(res.action).toBeUndefined();
      expect(res.reply).toContain("isn't part of what I can help with");
    });

    it('never advertises report-summary to that caller in the first place', async () => {
      classifyAs({ agent: 'out-of-scope', payload: {} });
      await service.route('summarize something', procurement);

      expect(systemPrompt()).not.toContain('report-summary');
    });

    it('allows report-summary for a caller who can read reports', async () => {
      classifyAs({ agent: 'report-summary', payload: { reportId: 'rep-1' } });

      const res = await service.route('summarize report rep-1', siteEng);

      expect(reportSummaryAgent.summarize).toHaveBeenCalledWith('rep-1', 'org-A', false);
      expect(res.reply).toBe('a summary');
    });

    it('blocks an invented agent name outright', async () => {
      classifyAs({ agent: 'delete-all-projects', payload: {} });

      const res = await service.route('drop everything', siteEng);

      expect(navigationAgent.handle).not.toHaveBeenCalled();
      expect(reportSummaryAgent.summarize).not.toHaveBeenCalled();
      expect(res.reply).toContain("isn't part of what I can help with");
    });

    it('falls back safely when the classifier returns unparseable JSON', async () => {
      createCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: 'not json at all' } }],
      });

      const res = await service.route('???', siteEng);

      expect(reportSummaryAgent.summarize).not.toHaveBeenCalled();
      expect(res.sessionId).toBe('sess-1');
      // 'unknown' is a "rephrase" situation, not an access boundary.
      expect(res.reply).toContain("I'm not sure how to help");
    });
  });

  describe('prompt construction', () => {
    it('lists only the caller sections in the classifier prompt', async () => {
      classifyAs({ agent: 'navigation', payload: {} });
      await service.route('take me somewhere', siteEng);

      const prompt = systemPrompt();
      expect(prompt).toContain('Daily Reports');
      expect(prompt).not.toContain('Budget');
    });

    it('hands the navigation agent the caller own scope', async () => {
      classifyAs({ agent: 'navigation', payload: {} });
      await service.route('take me to my reports', siteEng);

      const scope = navigationAgent.handle.mock.calls[0][1];
      expect(scope.role).toBe('SITE_ENG');
      expect(scope.destinations.map((d: any) => d.key)).not.toContain('budget');
    });
  });

  describe('report-summary without an id', () => {
    it('asks for the report instead of falling back to projectId (which always 404s)', async () => {
      classifyAs({ agent: 'report-summary', payload: {} });

      const res = await service.route('summarize the report', {
        ...siteEng,
        projectId: 'proj-9',
      });

      expect(reportSummaryAgent.summarize).not.toHaveBeenCalled();
      expect(res.reply).toContain('Which daily report');
    });
  });

  describe('persistence', () => {
    it('records refusals in the chat history like any other reply', async () => {
      classifyAs({ agent: 'report-summary', payload: { reportId: 'rep-1' } });
      await service.route('summarize report rep-1', procurement);

      const assistantWrite = chatSessionService.appendMessage.mock.calls.find(
        (c) => c[1] === 'assistant',
      );
      expect(assistantWrite).toBeDefined();
      expect(assistantWrite?.[4]).toEqual({ agent: 'report-summary' });
    });
  });
});
