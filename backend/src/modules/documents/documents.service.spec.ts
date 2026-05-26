import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from './schemas/document.schema';
import { Project } from '../projects/schemas/project.schema';
import { S3Service } from '../uploads/s3.service';
import { DocumentType } from '../../common/enums';

/**
 * Unit tests for DocumentsService — org scoping, not-found, and the multipart
 * upload validation/flow. Mongoose model + S3Service are fully mocked.
 */
describe('DocumentsService', () => {
  let service: DocumentsService;
  let model: any;
  let projectModel: any;
  let s3: { uploadFile: jest.Mock };

  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });
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
    projectModel = { find: jest.fn().mockReturnValue(projectFindChain([])) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getModelToken(DocumentEntity.name), useValue: model },
        { provide: getModelToken(Project.name), useValue: projectModel },
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

    it('restricts a non-orgWide viewer to their member projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
      await service.findAll('org-1', false, undefined, undefined, { userId: 'eng-1', orgWide: false });
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] } });
    });

    it('does NOT member-scope an orgWide viewer (manage:documents)', async () => {
      await service.findAll('org-1', false, undefined, undefined, { userId: 'pm-1', orgWide: true });
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('matches nothing when a non-orgWide viewer requests a non-member project', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAll('org-1', false, 'p9', undefined, { userId: 'eng-1', orgWide: false });
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: [] } });
    });

    it('returns [] when the viewer belongs to no projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([]));
      const res = await service.findAll('org-1', false, undefined, undefined, { userId: 'eng-1', orgWide: false });
      expect(res).toEqual([]);
      expect(model.find).not.toHaveBeenCalled();
    });

    it('filters by dailyReportId (SE-5 report photos)', async () => {
      await service.findAll('org-1', false, undefined, undefined, undefined, 'rep-1');
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1', dailyReportId: 'rep-1' });
    });

    it('still member-scopes when filtering by dailyReportId', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAll('org-1', false, undefined, undefined, { userId: 'eng-1', orgWide: false }, 'rep-1');
      expect(model.find).toHaveBeenCalledWith({
        organizationId: 'org-1',
        dailyReportId: 'rep-1',
        projectId: { $in: ['p1'] },
      });
    });
  });

  describe('update', () => {
    const doc = (over: Partial<any> = {}) => {
      const d: any = { _id: 'd-1', dailyReportId: null, ...over };
      d.save = jest.fn().mockResolvedValue(d);
      d.toObject = jest.fn().mockReturnValue({ ...d });
      return d;
    };

    it('throws NotFound when missing and never writes', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(service.update('d-1', 'org-1', false, { dailyReportId: 'rep-1' }))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('scopes the lookup by organizationId for non-super-admins', async () => {
      model.findOne.mockResolvedValue(doc());
      await service.update('d-1', 'org-1', false, { dailyReportId: 'rep-1' });
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'd-1', organizationId: 'org-1' });
    });

    it('does NOT org-scope the lookup for super admins', async () => {
      model.findOne.mockResolvedValue(doc());
      await service.update('d-1', 'org-1', true, { dailyReportId: 'rep-1' });
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'd-1' });
    });

    it('attaches the document to a report', async () => {
      const d = doc();
      model.findOne.mockResolvedValue(d);
      await service.update('d-1', 'org-1', false, { dailyReportId: 'rep-1' });
      expect(d.dailyReportId).toBe('rep-1');
      expect(d.save).toHaveBeenCalled();
    });

    it('unlinks when dailyReportId is null', async () => {
      const d = doc({ dailyReportId: 'rep-1' });
      model.findOne.mockResolvedValue(d);
      await service.update('d-1', 'org-1', false, { dailyReportId: null });
      expect(d.dailyReportId).toBeNull();
      expect(d.save).toHaveBeenCalled();
    });

    it('leaves dailyReportId untouched when the field is absent', async () => {
      const d = doc({ dailyReportId: 'rep-1' });
      model.findOne.mockResolvedValue(d);
      await service.update('d-1', 'org-1', false, {});
      expect(d.dailyReportId).toBe('rep-1');
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

    it('persists dailyReportId and defaults an image upload to IMAGE (SE-5)', async () => {
      await service.uploadAndCreate('org-1', 'eng-1', file({ originalname: 'site.jpg', mimetype: 'image/jpeg' }), {
        projectId: 'proj-1',
        dailyReportId: 'rep-1',
      });
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        dailyReportId: 'rep-1',
        type: DocumentType.IMAGE,
        mimeType: 'image/jpeg',
      }));
    });

    it('honours an explicit type over the image default', async () => {
      await service.uploadAndCreate('org-1', 'eng-1', file({ originalname: 'site.jpg', mimetype: 'image/jpeg' }), {
        type: DocumentType.TECHNICAL_FILE,
      });
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ type: DocumentType.TECHNICAL_FILE }));
    });

    it('defaults a non-image upload with no type to OTHER and dailyReportId null', async () => {
      await service.uploadAndCreate('org-1', 'eng-1', file(), {});
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        type: DocumentType.OTHER,
        dailyReportId: null,
      }));
    });
  });
});
