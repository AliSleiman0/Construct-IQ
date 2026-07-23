import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentEntity, DocumentEntityDocument } from './schemas/document.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Unit, UnitDocument } from '../units/schemas/unit.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { S3Service } from '../uploads/s3.service';
import { DocumentType } from '../../common/enums';

/** Who is asking — when orgWide is false, results are limited to member projects. */
export interface DocumentViewer {
  userId: string;
  orgWide: boolean;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/acad', 'image/vnd.dwg', 'application/dxf',
]);

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private documentModel: Model<DocumentEntityDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
    private readonly s3: S3Service,
  ) {}

  /**
   * Project ids the user bought a unit in. An external buyer is a member of no
   * project, so without this their contract and floor-plan documents would be
   * invisible to them. Mirrors UnitsService.buyerProjectIds.
   */
  private async buyerProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const units = await this.unitModel
      .find({ organizationId, buyerId: userId })
      .select('projectId')
      .lean();
    return Array.from(new Set(units.map((u: any) => String(u.projectId))));
  }

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    type?: string,
    viewer?: DocumentViewer,
    dailyReportId?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    if (type) filter.type = type;
    if (dailyReportId) filter.dailyReportId = dailyReportId;

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const [memberIds, ownedIds] = await Promise.all([
        this.memberProjectIds(organizationId, viewer.userId),
        this.buyerProjectIds(organizationId, viewer.userId),
      ]);
      const restrictIds = Array.from(new Set([...memberIds, ...ownedIds]));
      if (restrictIds.length === 0) return [];
      // Honour an explicit project filter only if the caller is a member.
      filter.projectId =
        projectId && restrictIds.includes(projectId)
          ? projectId
          : projectId
            ? { $in: [] }
            : { $in: restrictIds };
    }

    return this.documentModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.documentModel.findOne(filter).lean();
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(organizationId: string, uploadedById: string, dto: CreateDocumentDto): Promise<any> {
    return this.documentModel.create({
      organizationId,
      uploadedById,
      projectId: dto.projectId ?? null,
      dailyReportId: dto.dailyReportId ?? null,
      issueId: dto.issueId ?? null,
      type: dto.type,
      name: dto.name,
      description: dto.description ?? null,
      fileKey: dto.fileKey,
      fileUrl: dto.fileUrl ?? null,
      mimeType: dto.mimeType ?? null,
      sizeBytes: dto.sizeBytes ?? null,
    });
  }

  /**
   * Stream a multipart upload to S3 (throws 503 if storage isn't configured),
   * then record the Document. The S3 key is org/project-scoped + de-duped by
   * timestamp so two files with the same name don't collide.
   */
  async uploadAndCreate(
    organizationId: string,
    uploadedById: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
    dto: UploadDocumentDto,
  ): Promise<any> {
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds the 25 MB limit');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
    const scope = dto.projectId ?? 'general';
    const key = `org/${organizationId}/project/${scope}/${Date.now()}-${safeName}`;
    const fileUrl = await this.s3.uploadFile(file.buffer, key, file.mimetype);

    // Photos attached to a daily report land as IMAGE without the client having
    // to set the type explicitly; non-image uploads keep their explicit/OTHER type.
    const defaultType = file.mimetype.startsWith('image/')
      ? DocumentType.IMAGE
      : DocumentType.OTHER;

    return this.documentModel.create({
      organizationId,
      uploadedById,
      projectId: dto.projectId ?? null,
      dailyReportId: dto.dailyReportId ?? null,
      type: dto.type ?? defaultType,
      name: dto.name?.trim() || file.originalname,
      description: dto.description ?? null,
      fileKey: key,
      fileUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  /**
   * Attach an existing document to a daily report (or unlink it with `null`).
   * Org-scoped like {@link softDelete} — non-super-admins can only touch their
   * own org's documents.
   */
  async update(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
    dto: UpdateDocumentDto,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.documentModel.findOne(filter);
    if (!doc) throw new NotFoundException('Document not found');
    if (dto.dailyReportId !== undefined) doc.dailyReportId = dto.dailyReportId;
    await doc.save();
    return doc.toObject();
  }

  async softDelete(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.documentModel.findOne(filter);
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Document deleted successfully' };
  }
}
