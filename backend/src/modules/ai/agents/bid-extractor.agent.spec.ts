import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

const createCompletion = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: createCompletion } },
    })),
  };
});

import { BidExtractorAgent } from './bid-extractor.agent';
import { BidPriceBasis } from '../../bids/schemas/bid.schema';

describe('BidExtractorAgent', () => {
  let agent: BidExtractorAgent;

  const validResponse = (overrides: Record<string, unknown> = {}) => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            contractor: 'Acme Electrical',
            trade: 'Electrical',
            total_price: 125000,
            currency: 'usd',
            price_basis: 'lump sum',
            inclusions: ['cable runs', 'panel installation'],
            exclusions: ['fixtures'],
            payment_terms: { advance_percent: 30, structure: '30/40/30' },
            validity_days: 30,
            warranty_months: 12,
            red_flags: ['No warranty on fixtures'],
            scope_completeness_score: 88,
            summary: 'Comprehensive lump-sum bid with 30% advance.',
            ...overrides,
          }),
        },
      },
    ],
  });

  beforeEach(async () => {
    createCompletion.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BidExtractorAgent,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('fake-key') },
        },
      ],
    }).compile();
    agent = moduleRef.get(BidExtractorAgent);
  });

  it('extracts and normalizes a valid bid', async () => {
    createCompletion.mockResolvedValue(validResponse());

    const result = await agent.extract('some bid text');

    expect(result.data.contractor).toBe('Acme Electrical');
    expect(result.data.currency).toBe('USD'); // uppercased
    expect(result.data.price_basis).toBe(BidPriceBasis.LUMP_SUM);
    expect(result.data.scope_completeness_score).toBe(88);
    expect(result.data.inclusions).toHaveLength(2);
    expect(result.raw).toMatchObject({ contractor: 'Acme Electrical' });
  });

  it('throws when the PDF text is empty', async () => {
    await expect(agent.extract('')).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('throws on unparseable JSON', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: 'not json at all' } }],
    });
    await expect(agent.extract('text')).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('clamps an invalid scope_completeness_score into 0–100', async () => {
    createCompletion.mockResolvedValue(validResponse({ scope_completeness_score: 250 }));
    const r = await agent.extract('text');
    expect(r.data.scope_completeness_score).toBe(100);
  });

  it('falls back to LUMP_SUM when price_basis is unrecognized', async () => {
    createCompletion.mockResolvedValue(validResponse({ price_basis: 'unicorn' }));
    const r = await agent.extract('text');
    expect(r.data.price_basis).toBe(BidPriceBasis.LUMP_SUM);
  });

  it('coerces missing arrays to empty arrays, not null', async () => {
    createCompletion.mockResolvedValue(
      validResponse({ inclusions: null, exclusions: undefined, red_flags: 'oops' }),
    );
    const r = await agent.extract('text');
    expect(r.data.inclusions).toEqual([]);
    expect(r.data.exclusions).toEqual([]);
    expect(r.data.red_flags).toEqual([]);
  });

  it('keeps validity_days / warranty_months null when not provided', async () => {
    createCompletion.mockResolvedValue(
      validResponse({ validity_days: null, warranty_months: null }),
    );
    const r = await agent.extract('text');
    expect(r.data.validity_days).toBeNull();
    expect(r.data.warranty_months).toBeNull();
  });

  it('truncates very long PDF text before sending to OpenAI', async () => {
    createCompletion.mockResolvedValue(validResponse());
    const longText = 'a'.repeat(60_000);
    await agent.extract(longText);

    const userMessage = createCompletion.mock.calls[0][0].messages[1].content as string;
    // Truncated to 50k chars within the rendered prompt body.
    expect(userMessage).toContain('a'.repeat(100));
    expect(userMessage).not.toContain('a'.repeat(60_000));
  });
});
