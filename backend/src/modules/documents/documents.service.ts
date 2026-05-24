import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentEntity, DocumentEntityDocument } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { S3Service } from '../uploads/s3.service';
import { DocumentType } from '../../common/enums';

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
    private readonly s3: S3Service,
  ) {}

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    type?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    if (type) filter.type = type;
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

    return this.documentModel.create({
      organizationId,
      uploadedById,
      projectId: dto.projectId ?? null,
      type: dto.type ?? DocumentType.OTHER,
      name: dto.name?.trim() || file.originalname,
      description: dto.description ?? null,
      fileKey: key,
      fileUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  async softDelete(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.documentModel.findOne(filter);
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Document deleted successfully' };
  }
}
