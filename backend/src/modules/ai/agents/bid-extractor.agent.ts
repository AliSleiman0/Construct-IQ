import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  BidExtractedData,
  BidPriceBasis,
} from '../../bids/schemas/bid.schema';

export interface BidExtractionResult {
  data: BidExtractedData;
  raw: unknown;
}

const SYSTEM_PROMPT = `You are an expert construction contract analyst. Extract structured data from a subcontractor bid document.

Return ONLY a valid JSON object with no markdown, no explanation, no code fences.

For red_flags be specific. Examples:
- "Labor only — client bears all material cost, actual cost will be higher"
- "50% advance is unusually high, creates cash flow risk"
- "No warranty stated"
- "15-day validity too short for typical approval cycles"
- "Scope references drawings without specifying drawing numbers"`;

const SCHEMA_HINT = `Return JSON with exactly this shape:
{
  "contractor": string,
  "trade": string,
  "total_price": number,
  "currency": string,
  "price_basis": "lump sum" | "labor only" | "materials only" | "rate based",
  "inclusions": string[],
  "exclusions": string[],
  "payment_terms": { "advance_percent": number | null, "structure": string },
  "validity_days": number | null,
  "warranty_months": number | null,
  "red_flags": string[],
  "scope_completeness_score": number,
  "summary": string
}

Rules:
- total_price must be a number (no currency symbols, no thousands separators).
- currency is the ISO 4217 code (e.g. "USD", "EUR", "LBP"); if unstated, use "USD".
- price_basis must be one of the four allowed values; if ambiguous, choose the closest fit.
- scope_completeness_score is an integer 0–100 reflecting how thoroughly the bid covers the trade package scope.
- validity_days and warranty_months are nullable when not stated — do not invent values.
- payment_terms.advance_percent is the advance/down-payment as a number 0–100, or null if none.
- payment_terms.structure is a one-line description of the full payment schedule.
- Use empty arrays ([]) for inclusions/exclusions/red_flags when none apply, never null.
- summary is 1–2 sentences capturing the headline pricing and terms.`;

const MAX_TEXT_CHARS = 50_000;
const ALLOWED_PRICE_BASIS = new Set<string>(Object.values(BidPriceBasis));

@Injectable()
export class BidExtractorAgent {
  private readonly logger = new Logger(BidExtractorAgent.name);
  private readonly client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });
  }

  async extract(pdfText: string): Promise<BidExtractionResult> {
    if (!pdfText || pdfText.trim().length === 0) {
      throw new InternalServerErrorException('Bid PDF contained no extractable text.');
    }

    const truncated = pdfText.length > MAX_TEXT_CHARS
      ? pdfText.slice(0, MAX_TEXT_CHARS)
      : pdfText;

    const model = this.configService.get<string>('ai.model') ?? 'gpt-4o-mini';

    const response = await this.client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${SCHEMA_HINT}\n\n--- BID DOCUMENT TEXT START ---\n${truncated}\n--- BID DOCUMENT TEXT END ---`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.warn(`Bid extraction returned non-JSON content (len=${raw.length})`);
      throw new InternalServerErrorException(
        'AI extraction returned an unparseable response.',
      );
    }

    const data = this.normalize(parsed);
    return { data, raw: parsed };
  }

  private normalize(value: unknown): BidExtractedData {
    if (!value || typeof value !== 'object') {
      throw new InternalServerErrorException('AI extraction returned non-object payload.');
    }
    const obj = value as Record<string, unknown>;

    const stringArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];

    const numOrNull = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    const priceBasisRaw = typeof obj.price_basis === 'string' ? obj.price_basis : '';
    const priceBasis = ALLOWED_PRICE_BASIS.has(priceBasisRaw)
      ? priceBasisRaw
      : BidPriceBasis.LUMP_SUM;

    const paymentTermsRaw = (obj.payment_terms ?? {}) as Record<string, unknown>;

    const scopeScoreRaw = numOrNull(obj.scope_completeness_score) ?? 0;
    const scopeScore = Math.max(0, Math.min(100, Math.round(scopeScoreRaw)));

    return {
      contractor: typeof obj.contractor === 'string' ? obj.contractor : 'Unknown',
      trade: typeof obj.trade === 'string' ? obj.trade : '',
      total_price: numOrNull(obj.total_price) ?? 0,
      currency: typeof obj.currency === 'string' && obj.currency.length > 0
        ? obj.currency.toUpperCase()
        : 'USD',
      price_basis: priceBasis,
      inclusions: stringArray(obj.inclusions),
      exclusions: stringArray(obj.exclusions),
      payment_terms: {
        advance_percent: numOrNull(paymentTermsRaw.advance_percent),
        structure: typeof paymentTermsRaw.structure === 'string'
          ? paymentTermsRaw.structure
          : '',
      },
      validity_days: numOrNull(obj.validity_days),
      warranty_months: numOrNull(obj.warranty_months),
      red_flags: stringArray(obj.red_flags),
      scope_completeness_score: scopeScore,
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    };
  }
}
