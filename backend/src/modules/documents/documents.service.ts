import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentEntity, DocumentEntityDocument } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private documentModel: Model<DocumentEntityDocument>,
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

  async softDelete(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const doc = await this.documentModel.findOne(filter);
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Document deleted successfully' };
  }
}
