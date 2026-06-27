import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';

const createCompletion = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createCompletion } },
  })),
}));

import { ReportSummaryAgent } from './report-summary.agent';
import { DailyReport } from '../../reports/schemas/daily-report.schema';

/**
 * Security tests for ReportSummaryAgent.summarize (issues #24 + #25): a daily report
 * may only be summarized by a caller in its own organization. The boundary is the
 * findOne filter — asserted on the not-found branch, which throws BEFORE any OpenAI
 * call (so no network mock is exercised and nothing is persisted).
 */
describe('ReportSummaryAgent — org scoping (issues #24 / #25)', () => {
  let agent: ReportSummaryAgent;
  let reportModel: any;

  beforeEach(async () => {
    createCompletion.mockReset();
    reportModel = {
      findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
      updateOne: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportSummaryAgent,
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: getModelToken(DailyReport.name), useValue: reportModel },
      ],
    }).compile();
    agent = moduleRef.get(ReportSummaryAgent);
  });

  it('scopes the lookup by organizationId for a regular user and 404s on a cross-org id', async () => {
    await expect(agent.summarize('rep-x', 'org-A')).rejects.toBeInstanceOf(NotFoundException);
    expect(reportModel.findOne).toHaveBeenCalledWith({ _id: 'rep-x', organizationId: 'org-A' });
    // Security: nothing summarized, nothing persisted, OpenAI never called.
    expect(createCompletion).not.toHaveBeenCalled();
    expect(reportModel.updateOne).not.toHaveBeenCalled();
  });

  it('does NOT org-scope the lookup for a super admin', async () => {
    await expect(agent.summarize('rep-x', 'org-A', true)).rejects.toBeInstanceOf(NotFoundException);
    expect(reportModel.findOne).toHaveBeenCalledWith({ _id: 'rep-x' });
  });

  it('defaults to org-scoped (non-super-admin) when isSuperAdmin is omitted', async () => {
    await expect(agent.summarize('rep-y', 'org-B')).rejects.toBeInstanceOf(NotFoundException);
    expect(reportModel.findOne).toHaveBeenCalledWith({ _id: 'rep-y', organizationId: 'org-B' });
  });
});
