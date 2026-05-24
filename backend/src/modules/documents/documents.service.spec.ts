import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from './schemas/document.schema';
import { S3Service } from '../uploads/s3.service';
import { DocumentType } from '../../common/enums';

/**
 * Unit tests for DocumentsService — org scoping, not-found, and the multipart
 * upload validation/flow. Mongoose model + S3Service are fully mocked.
 */
describe('DocumentsService', () => {
  let service: DocumentsService;
  let model: any;
  let s3: { uploadFile: jest.Mock };

  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  const file = (over: Partial<any> = {}) => ({
    buffer: Buffer.from('x'), originalname: 'plan.pdf', mimetype: 'application/pdf', size: 1024, ...over,
  });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ _id: 'd-1' }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    s3 = { uploadFile: jest.fn().mockResolvedValue('http://minio/key') };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getModelToken(DocumentEntity.name), useValue: model },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();
    service = moduleRef.get(DocumentsService);
  });

  describe('findAll', () => {
    it('scopes by organizationId for non-super-admins + applies projectId/type filters', async () => {
      await service.findAll('org-1', false, 'proj-1', 'DRAWING');
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: 'proj-1', type: 'DRAWING' });
    });
    it('does NOT scope by org for super admins', async () => {
      await service.findAll('org-1', true);
      expect(model.find).toHaveBeenCalledWith({});
    });
  });

  describe('softDelete', () => {
    it('throws NotFound when missing and never writes', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(service.softDelete('d-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.updateOne).not.toHaveBeenCalled();
    });
    it('soft-deletes by setting deletedAt', async () => {
      model.findOne.mockResolvedValue({ _id: 'd-1' });
      await service.softDelete('d-1', 'org-1', false);
      expect(model.updateOne).toHaveBeenCalledWith({ _id: 'd-1' }, expect.objectContaining({ deletedAt: expect.any(Date) }));
    });
  });

  describe('uploadAndCreate', () => {
    it('rejects a missing file (400)', async () => {
      await expect(service.uploadAndCreate('org-1', 'u-1', undefined, {})).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.uploadFile).not.toHaveBeenCalled();
    });
    it('rejects an oversized file (400)', async () => {
      await expect(service.uploadAndCreate('org-1', 'u-1', file({ size: 26 * 1024 * 1024 }), {})).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.uploadFile).not.toHaveBeenCalled();
    });
    it('rejects a disallowed mime type (400)', async () => {
      await expect(service.uploadAndCreate('org-1', 'u-1', file({ mimetype: 'application/x-msdownload' }), {})).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.uploadFile).not.toHaveBeenCalled();
    });
    it('uploads to S3 and records the document', async () => {
      await service.uploadAndCreate('org-1', 'u-9', file(), { projectId: 'proj-1', type: DocumentType.DRAWING });
      expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(Buffer), expect.stringContaining('org/org-1/project/proj-1/'), 'application/pdf');
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'org-1', uploadedById: 'u-9', projectId: 'proj-1',
        type: DocumentType.DRAWING, name: 'plan.pdf', fileUrl: 'http://minio/key',
        mimeType: 'application/pdf', sizeBytes: 1024,
      }));
    });
  });
});
