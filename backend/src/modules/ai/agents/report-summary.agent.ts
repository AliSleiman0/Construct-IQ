import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import OpenAI from 'openai';
import {
  DailyReport,
  DailyReportDocument,
} from '../../reports/schemas/daily-report.schema';

@Injectable()
export class ReportSummaryAgent {
  private readonly logger = new Logger(ReportSummaryAgent.name);
  private readonly client: OpenAI;

  constructor(
    private configService: ConfigService,
    @InjectModel(DailyReport.name)
    private dailyReportModel: Model<DailyReportDocument>,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });
  }

  async summarize(reportId: string, organizationId: string, isSuperAdmin = false): Promise<string> {
    // Multi-tenancy boundary: a daily report may only be summarized by a caller in
    // its own organization. Org-less Super Admins may summarize any (platform pattern).
    const filter = isSuperAdmin ? { _id: reportId } : { _id: reportId, organizationId };
    const report = await this.dailyReportModel.findOne(filter).lean();
    if (!report) {
      throw new NotFoundException(`Daily report ${reportId} not found`);
    }

    const manpowerText = report.manpowerEntries
      .map(
        (e) =>
          `${e.trade}: ${e.count} workers${e.contractor ? ` (${e.contractor})` : ''}`,
      )
      .join(', ');

    const materialsText = report.materialEntries
      .map((e) => `${e.material}: ${e.quantity} ${e.unit}`)
      .join(', ');

    const prompt = [
      `Daily Report for ${report.reportDate.toISOString().split('T')[0]}`,
      report.weather
        ? `Weather: ${report.weather}${report.highTempC != null ? `, High ${report.highTempC}°C` : ''}${report.lowTempC != null ? ` / Low ${report.lowTempC}°C` : ''}`
        : '',
      report.workCompleted ? `Work completed: ${report.workCompleted}` : '',
      report.blockers ? `Blockers: ${report.blockers}` : '',
      report.notes ? `Notes: ${report.notes}` : '',
      manpowerText ? `Manpower: ${manpowerText}` : '',
      materialsText ? `Materials used: ${materialsText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const model = this.configService.get<string>('ai.model') ?? 'gpt-4o-mini';

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a construction project assistant. Summarize daily site reports concisely for project managers. ' +
            'Highlight key achievements, active blockers, and any safety concerns. Keep it under 150 words.',
        },
        { role: 'user', content: `Summarize this daily report:\n\n${prompt}` },
      ],
      max_tokens: 512,
    });

    const summary = response.choices[0]?.message?.content ?? '';

    await this.dailyReportModel.updateOne(
      filter,
      { aiSummary: summary, aiSummaryAt: new Date() },
    );

    return summary;
  }
}
