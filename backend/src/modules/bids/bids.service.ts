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
import { DocumentType, PurchaseOrderStatus } from '../../common/enums';
import { ProcurementService } from '../procurement/procurement.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly procurementService: ProcurementService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Fire-and-forget audit write — a logging failure must never break the op. */
  private audit(entry: Parameters<AuditService['log']>[0]): void {
    this.auditService.log(entry).catch(() => undefined);
  }

  /** Fire-and-forget notification fan-out — a delivery failure must never break the op. */
  private notify(
    organizationId: string,
    userIds: (string | null | undefined)[],
    payload: Parameters<NotificationsService['notifyMany']>[2],
  ): void {
    this.notificationsService.notifyMany(organizationId, userIds, payload).catch(() => undefined);
  }

  /** A readable, effectively-unique PO number; the {org, poNumber} unique index is the backstop. */
  private generatePoNumber(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .toUpperCase()
      .padStart(4, '0');
    return `PO-${stamp}-${rand}`;
  }

  /**
   * Award a bid: validates the chosen supplier, auto-creates a DRAFT PurchaseOrder
   * seeded from the bid's extracted data, and stamps the bid as awarded. A bid can
   * only be awarded once. (#36 — cross-module workflow seam.)
   */
  async awardBid(
    id: string,
    organizationId: string,
    supplierId: string,
    actorUserId: string,
    isSuperAdmin: boolean,
  ): Promise<{ bid: any; purchaseOrder: any }> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const bid = await this.bidModel.findOne(filter);
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.awardedAt || bid.purchaseOrderId) {
      throw new ConflictException('This bid has already been awarded');
    }

    // Validate the supplier belongs to the bid's org (throws NotFound if absent).
    const orgId = bid.organizationId;
    await this.procurementService.findSupplierById(supplierId, orgId, isSuperAdmin);

    const extracted = (bid.extractedData ?? null) as { total_price?: number; currency?: string } | null;

    // Create the DRAFT PO (retry once if the random poNumber collides).
    let purchaseOrder: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        purchaseOrder = await this.procurementService.createPO(orgId, {
          projectId: bid.projectId,
          supplierId,
          poNumber: this.generatePoNumber(),
          status: PurchaseOrderStatus.DRAFT,
          orderDate: new Date().toISOString(),
          totalAmount: extracted?.total_price ?? undefined,
          currency: extracted?.currency ?? 'USD',
          notes: `Auto-created from awarded bid: ${bid.tradePackage}`,
        } as any);
        break;
      } catch (e) {
        if (e instanceof ConflictException && attempt === 0) continue;
        throw e;
      }
    }

    bid.awardedSupplierId = supplierId;
    bid.awardedById = actorUserId;
    bid.awardedAt = new Date();
    bid.purchaseOrderId = purchaseOrder._id;
    await bid.save();

    this.audit({
      organizationId: orgId,
      actorUserId,
      projectId: bid.projectId,
      action: 'AWARD',
      entityType: 'BID',
      entityId: bid._id,
      metadata: { supplierId, purchaseOrderId: purchaseOrder._id },
    });
    this.notify(orgId, [bid.uploadedById].filter((u) => u !== actorUserId), {
      title: 'Bid awarded',
      message: `Bid "${bid.tradePackage}" was awarded — a draft purchase order was created.`,
      type: 'success',
      entityType: 'BID',
      entityId: bid._id,
    });

    return { bid: bid.toObject(), purchaseOrder };
  }

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
