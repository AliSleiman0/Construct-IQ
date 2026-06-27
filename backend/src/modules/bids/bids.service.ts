import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import pdfParse from 'pdf-parse';
import { Bid, BidDocument, BidExtractionStatus } from './schemas/bid.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { DocumentsService } from '../documents/documents.service';
import { BidExtractorAgent } from '../ai/agents/bid-extractor.agent';
import { UploadBidsDto } from './dto/upload-bids.dto';
import { ListBidsQueryDto } from './dto/list-bids.query.dto';
import { DocumentType } from '../../common/enums';

const EXTRACTION_CONCURRENCY = 5;
const MAX_FILES_PER_UPLOAD = 10;

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    @InjectModel(Bid.name) private bidModel: Model<BidDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private readonly documentsService: DocumentsService,
    private readonly bidExtractor: BidExtractorAgent,
  ) {}

  async uploadAndExtract(
    organizationId: string,
    userId: string,
    isSuperAdmin: boolean,
    dto: UploadBidsDto,
    files: UploadedFile[],
  ): Promise<BidDocument[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one bid PDF is required.');
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      throw new BadRequestException(
        `A maximum of ${MAX_FILES_PER_UPLOAD} bids can be uploaded in a single request.`,
      );
    }

    for (const f of files) {
      if (f.mimetype !== 'application/pdf') {
        throw new BadRequestException(
          `Only PDF bids are supported. "${f.originalname}" is ${f.mimetype || 'unknown'}.`,
        );
      }
    }

    await this.ensureProjectAccessible(dto.projectId, organizationId, isSuperAdmin);

    await this.assertNoDuplicateBids(organizationId, dto, files);

    const tasks = files.map((file) => () =>
      this.processSingleBid(organizationId, userId, dto, file),
    );

    const created = await runWithConcurrency(tasks, EXTRACTION_CONCURRENCY);
    return created;
  }

  async list(
    organizationId: string,
    isSuperAdmin: boolean,
    query: ListBidsQueryDto,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (query.projectId) filter.projectId = query.projectId;
    if (query.status) filter.extractionStatus = query.status;
    if (query.tradePackage) filter.tradePackage = query.tradePackage;

    return this.bidModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findOne(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const bid = await this.bidModel.findOne(filter).lean();
    if (!bid) throw new NotFoundException('Bid not found');
    return bid;
  }

  async remove(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ): Promise<{ message: string }> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const bid = await this.bidModel.findOne(filter);
    if (!bid) throw new NotFoundException('Bid not found');
    await this.bidModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Bid deleted successfully' };
  }

  private async ensureProjectAccessible(
    projectId: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ): Promise<void> {
    const filter = isSuperAdmin
      ? { _id: projectId }
      : { _id: projectId, organizationId };
    const project = await this.projectModel.findOne(filter).select('_id').lean();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  /**
   * Rejects re-uploading the same file for a given project + trade package.
   * Multiple distinct competing bids per trade remain allowed (bid leveling);
   * only an exact filename match against the incoming batch or an existing
   * (non-deleted) bid is treated as a duplicate. #30
   */
  private async assertNoDuplicateBids(
    organizationId: string,
    dto: UploadBidsDto,
    files: UploadedFile[],
  ): Promise<void> {
    const incoming = files.map((f) => f.originalname);

    // Within the batch itself.
    const seen = new Set<string>();
    for (const name of incoming) {
      if (seen.has(name)) {
        throw new ConflictException(
          `Duplicate file "${name}" in this upload for trade package "${dto.tradePackage}".`,
        );
      }
      seen.add(name);
    }

    // Against existing bids for the same project + trade package.
    const existing = await this.bidModel
      .find({
        organizationId,
        projectId: dto.projectId,
        tradePackage: dto.tradePackage,
        sourceFileName: { $in: incoming },
      })
      .select('sourceFileName')
      .lean();

    if (existing.length > 0) {
      const names = existing.map((b: any) => b.sourceFileName).join(', ');
      throw new ConflictException(
        `A bid for "${names}" already exists for trade package "${dto.tradePackage}".`,
      );
    }
  }

  private async processSingleBid(
    organizationId: string,
    userId: string,
    dto: UploadBidsDto,
    file: UploadedFile,
  ): Promise<BidDocument> {
    const document = await this.documentsService.uploadAndCreate(
      organizationId,
      userId,
      file,
      {
        projectId: dto.projectId,
        type: DocumentType.PURCHASE_DOCUMENT,
        name: file.originalname,
        description: `Subcontractor bid — ${dto.tradePackage}`,
      },
    );

    const bid = await this.bidModel.create({
      organizationId,
      projectId: dto.projectId,
      tradePackage: dto.tradePackage,
      sourceDocumentId: document._id,
      sourceFileName: file.originalname,
      uploadedById: userId,
      extractionStatus: BidExtractionStatus.PENDING,
    });

    try {
      const parsed = await pdfParse(file.buffer);
      const text = parsed.text ?? '';
      const { data, raw } = await this.bidExtractor.extract(text);

      bid.extractedData = data;
      bid.aiRawResponse = raw;
      bid.extractionStatus = BidExtractionStatus.COMPLETE;
      bid.extractedAt = new Date();
      bid.extractionError = null;
      await bid.save();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Bid extraction failed for "${file.originalname}" (bid ${bid._id}): ${message}`,
      );
      bid.extractionStatus = BidExtractionStatus.FAILED;
      bid.extractionError = message.slice(0, 500);
      bid.extractedAt = new Date();
      await bid.save();
    }

    return bid;
  }
}

/** Runs an array of thunks with a max concurrency, preserving input order. */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}
