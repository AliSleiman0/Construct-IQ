import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DailyReport } from './schemas/daily-report.schema';

/**
 * Unit tests for ReportsService — org scoping, the populate/flatten mapping
 * (createdBy + project names), and the unique (projectId, reportDate) conflict.
 * The Mongoose model is fully mocked; no DB.
 */
describe('ReportsService', () => {
  let service: ReportsService;
  let model: any;

  // find(...).sort(...).populate(...).lean()
  const findChain = (result: any[]) => ({
    sort: () => ({ populate: () => ({ lean: () => Promise.resolve(result) }) }),
  });
  // findOne(...).populate(...).lean()
  const findOneChain = (result: any) => ({
    populate: () => ({ lean: () => Promise.resolve(result) }),
  });

  const populatedDoc = () => ({
    _id: 'rep-1',
    organizationId: 'org-1',
    reportDate: new Date('2026-05-20'),
    weather: 'SUNNY',
    workCompleted: 'Deck pour',
    projectId: { _id: 'proj-1', name: 'Tower Heights' },
    createdById: { _id: 'u-1', firstName: 'Pete', lastName: 'Williams' },
    manpowerEntries: [{ trade: 'Concrete', count: 8 }],
    equipmentEntries: [],
  });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: getModelToken(DailyReport.name), useValue: model }],
    }).compile();
    service = moduleRef.get(ReportsService);
  });

  describe('findAll', () => {
    it('scopes by organizationId for non-super-admins', async () => {
      await service.findAll('org-1', false);
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('does NOT scope by org for super admins', async () => {
      await service.findAll('org-1', true);
      expect(model.find).toHaveBeenCalledWith({});
    });

    it('adds the projectId filter when provided', async () => {
      await service.findAll('org-1', false, 'proj-1');
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: 'proj-1' });
    });

    it('flattens populated createdBy + project into id + name objects', async () => {
      model.find.mockReturnValue(findChain([populatedDoc()]));
      const [report] = await service.findAll('org-1', false);
      expect(report.id).toBe('rep-1');
      expect(report.projectId).toBe('proj-1');
      expect(report.project).toEqual({ id: 'proj-1', name: 'Tower Heights' });
      expect(report.createdById).toBe('u-1');
      expect(report.createdBy).toEqual({ id: 'u-1', firstName: 'Pete', lastName: 'Williams' });
    });
  });

  describe('findById', () => {
    it('throws NotFound when missing (or another org)', async () => {
      model.findOne.mockReturnValue(findOneChain(null));
      await expect(service.findById('rep-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'rep-1', organizationId: 'org-1' });
    });

    it('returns the flattened report when found', async () => {
      model.findOne.mockReturnValue(findOneChain(populatedDoc()));
      const report = await service.findById('rep-1', 'org-1', false);
      expect(report.id).toBe('rep-1');
      expect(report.createdBy).toEqual({ id: 'u-1', firstName: 'Pete', lastName: 'Williams' });
    });
  });

  describe('create', () => {
    it('throws Conflict when a report for the same project+date exists', async () => {
      model.findOne.mockResolvedValue({ _id: 'rep-existing' });
      await expect(
        service.create('org-1', 'u-1', { projectId: 'proj-1', reportDate: '2026-05-20' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('persists with caller org + creator when no duplicate', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue({ _id: 'rep-1' });
      await service.create('org-1', 'u-1', {
        projectId: 'proj-1',
        reportDate: '2026-05-21',
        workCompleted: 'Framing',
      } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-1', createdById: 'u-1', projectId: 'proj-1' }),
      );
    });
  });

  describe('update', () => {
    it('throws Forbidden when a non-author non-admin edits', async () => {
      const doc: any = { createdById: 'u-1', save: jest.fn() };
      model.findOne.mockResolvedValue(doc);
      await expect(
        service.update('rep-1', 'org-1', 'u-OTHER', { notes: 'x' } as any, false),
      ).rejects.toMatchObject({ status: 403 });
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('author edit saves then returns the populated report', async () => {
      const doc: any = { createdById: 'u-1', save: jest.fn() };
      model.findOne
        .mockResolvedValueOnce(doc) // mutation fetch
        .mockReturnValueOnce(findOneChain(populatedDoc())); // findById re-read
      const result = await service.update('rep-1', 'org-1', 'u-1', { notes: 'updated' } as any, false);
      expect(doc.notes).toBe('updated');
      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe('rep-1');
      expect(result.project).toEqual({ id: 'proj-1', name: 'Tower Heights' });
    });
  });
});
