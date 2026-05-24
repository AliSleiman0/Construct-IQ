import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { Issue } from './schemas/issue.schema';
import { Project } from '../projects/schemas/project.schema';
import { IssueStatus, IssueSeverity } from '../../common/enums';

/**
 * Unit tests for IssuesService — multi-tenancy scoping + the populate/flatten
 * mapping that turns ref ids into `createdBy` / `assignedTo` / `project` /
 * comment `author` objects. The Mongoose model is fully mocked; no DB.
 */
describe('IssuesService', () => {
  let service: IssuesService;
  let model: any;
  let projectModel: any;

  // projectModel.find(...).select(...).lean() — member-project lookup
  const projectFindChain = (result: any[]) => ({
    select: () => ({ lean: () => Promise.resolve(result) }),
  });

  // find(...).populate(...).lean()  — the paginated findAll re-fetch by id
  const findChain = (result: any[]) => ({
    populate: () => ({ lean: () => Promise.resolve(result) }),
  });
  // findOne(...).populate(...).lean()
  const findOneChain = (result: any) => ({
    populate: () => ({ lean: () => Promise.resolve(result) }),
  });

  const populatedDoc = () => ({
    _id: 'iss-1',
    organizationId: 'org-1',
    title: 'Crack in beam',
    severity: IssueSeverity.HIGH,
    status: IssueStatus.OPEN,
    projectId: { _id: 'proj-1', name: 'Tower Heights' },
    createdById: { _id: 'u-1', firstName: 'Pete', lastName: 'Williams' },
    assignedToId: { _id: 'u-2', firstName: 'Sara', lastName: 'Diaz' },
    comments: [
      { _id: 'c-1', authorId: { _id: 'u-1', firstName: 'Pete', lastName: 'Williams' }, body: 'On it' },
    ],
  });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      aggregate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    };
    projectModel = {
      find: jest.fn().mockReturnValue(projectFindChain([])),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        IssuesService,
        { provide: getModelToken(Issue.name), useValue: model },
        { provide: getModelToken(Project.name), useValue: projectModel },
      ],
    }).compile();
    service = moduleRef.get(IssuesService);
  });

  describe('findAll (paginated)', () => {
    it('returns { items, total, limit, skip }, org-scoped + excludes deleted', async () => {
      model.aggregate.mockResolvedValue([{ _id: 'i1' }, { _id: 'i2' }]);
      model.countDocuments.mockResolvedValue(2);
      model.find.mockReturnValue(findChain([
        { _id: 'i2', title: 'B' },
        { _id: 'i1', title: 'A' },
      ]));

      const res = await service.findAll('org-1', false, { limit: 10, skip: 0 });
      expect(res.total).toBe(2);
      expect(res.limit).toBe(10);
      // Items reordered to the aggregation order (i1, i2), not the find() order.
      expect(res.items.map((i: any) => i.id)).toEqual(['i1', 'i2']);
      expect(model.aggregate.mock.calls[0][0][0].$match).toMatchObject({ organizationId: 'org-1', deletedAt: null });
    });

    it('does NOT org-scope for super admins', async () => {
      await service.findAll('org-1', true, {});
      expect(model.aggregate.mock.calls[0][0][0].$match.organizationId).toBeUndefined();
    });

    it('caps limit at 200', async () => {
      const res = await service.findAll('org-1', false, { limit: 5000 });
      expect(res.limit).toBe(200);
      const limitStage = model.aggregate.mock.calls[0][0].find((s: any) => '$limit' in s);
      expect(limitStage.$limit).toBe(200);
    });

    it('maps the NONE assignee sentinel to null + applies type filter', async () => {
      await service.findAll('org-1', false, { assignedToId: 'NONE', type: 'SAFETY' });
      const match = model.aggregate.mock.calls[0][0][0].$match;
      expect(match.assignedToId).toBeNull();
      expect(match.type).toBe('SAFETY');
    });

    it('flattens populated refs into id + name objects', async () => {
      model.aggregate.mockResolvedValue([{ _id: 'iss-1' }]);
      model.countDocuments.mockResolvedValue(1);
      model.find.mockReturnValue(findChain([populatedDoc()]));
      const { items } = await service.findAll('org-1', false, {});
      const issue = items[0];
      expect(issue.id).toBe('iss-1');
      expect(issue.project).toEqual({ id: 'proj-1', name: 'Tower Heights' });
      expect(issue.assignedTo).toEqual({ id: 'u-2', firstName: 'Sara', lastName: 'Diaz' });
      expect(issue.comments[0]).toMatchObject({ id: 'c-1', author: { id: 'u-1', firstName: 'Pete', lastName: 'Williams' } });
    });
  });

  describe('findAll member-scoping', () => {
    it('restricts a non-orgWide viewer to their member projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
      model.aggregate.mockResolvedValue([]);
      await service.findAll('org-1', false, {}, { userId: 'eng-1', orgWide: false });
      const match = model.aggregate.mock.calls[0][0][0].$match;
      expect(match.projectId).toEqual({ $in: ['p1', 'p2'] });
      expect(projectModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', 'members.userId': 'eng-1' });
    });

    it('does NOT member-scope an orgWide viewer (e.g. PM with manage:issues)', async () => {
      await service.findAll('org-1', false, {}, { userId: 'pm-1', orgWide: true });
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(model.aggregate.mock.calls[0][0][0].$match.projectId).toBeUndefined();
    });

    it('honours an explicit projectId only when the viewer is a member', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAll('org-1', false, { projectId: 'p1' }, { userId: 'eng-1', orgWide: false });
      expect(model.aggregate.mock.calls[0][0][0].$match.projectId).toBe('p1');
    });

    it('matches nothing when the viewer requests a project they are not a member of', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAll('org-1', false, { projectId: 'p9' }, { userId: 'eng-1', orgWide: false });
      expect(model.aggregate.mock.calls[0][0][0].$match.projectId).toEqual({ $in: [] });
    });

    it('short-circuits to empty when the viewer belongs to no projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([]));
      const res = await service.findAll('org-1', false, {}, { userId: 'eng-1', orgWide: false });
      expect(res).toEqual({ items: [], total: 0, limit: 25, skip: 0 });
      expect(model.aggregate).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('returns all triage counts incl. a stale (createdAt threshold) count', async () => {
      model.countDocuments.mockResolvedValue(3);
      const res = await service.getSummary('org-1', false);
      expect(res).toEqual(
        expect.objectContaining({ total: 3, open: 3, inProgress: 3, resolved: 3, closed: 3, critical: 3, unassigned: 3, stale: 3 }),
      );
      expect(model.countDocuments.mock.calls.some((c: any) => c[0]?.createdAt?.$lt)).toBe(true);
    });
  });

  describe('bulkUpdate', () => {
    it('stamps resolvedAt + org-scopes when setting RESOLVED', async () => {
      model.updateMany.mockResolvedValue({ modifiedCount: 2 });
      const res = await service.bulkUpdate('org-1', false, { ids: ['a', 'b'], status: IssueStatus.RESOLVED });
      expect(res).toEqual({ modified: 2 });
      const [filter, update] = model.updateMany.mock.calls[0];
      expect(filter).toEqual({ _id: { $in: ['a', 'b'] }, organizationId: 'org-1' });
      expect(update.$set.status).toBe(IssueStatus.RESOLVED);
      expect(update.$set.resolvedAt).toBeInstanceOf(Date);
    });

    it('clears resolution timestamps on reopen (OPEN)', async () => {
      await service.bulkUpdate('org-1', false, { ids: ['a'], status: IssueStatus.OPEN });
      const update = model.updateMany.mock.calls[0][1];
      expect(update.$set.resolvedAt).toBeNull();
      expect(update.$set.closedAt).toBeNull();
    });

    it('unassigns ("" → null) without touching status, and no-ops on empty ids', async () => {
      await service.bulkUpdate('org-1', false, { ids: ['a'], assignedToId: '' });
      const update = model.updateMany.mock.calls[0][1];
      expect(update.$set.assignedToId).toBeNull();
      expect(update.$set.status).toBeUndefined();

      model.updateMany.mockClear();
      const res = await service.bulkUpdate('org-1', false, { ids: [] });
      expect(res).toEqual({ modified: 0 });
      expect(model.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('throws NotFound when missing (or another org)', async () => {
      model.findOne.mockReturnValue(findOneChain(null));
      await expect(service.findById('iss-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'iss-1', organizationId: 'org-1' });
    });

    it('returns the flattened issue when found', async () => {
      model.findOne.mockReturnValue(findOneChain(populatedDoc()));
      const issue = await service.findById('iss-1', 'org-1', false);
      expect(issue.id).toBe('iss-1');
      expect(issue.assignedTo).toEqual({ id: 'u-2', firstName: 'Sara', lastName: 'Diaz' });
    });
  });

  describe('create', () => {
    it('persists with caller org + creator and defaults status to OPEN', async () => {
      model.create.mockResolvedValue({ _id: 'iss-1' });
      await service.create('org-1', 'u-1', {
        projectId: 'proj-1',
        title: 'Crack in beam',
        severity: IssueSeverity.HIGH,
      } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          createdById: 'u-1',
          projectId: 'proj-1',
          status: IssueStatus.OPEN,
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFound (org-scoped) when not found', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(
        service.update('iss-1', 'org-1', { status: IssueStatus.RESOLVED } as any, false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'iss-1', organizationId: 'org-1' });
    });

    it('saves changes then returns the populated issue', async () => {
      const doc: any = { save: jest.fn() };
      model.findOne
        .mockReturnValueOnce(doc) // mutation fetch (no chain)
        .mockReturnValueOnce(findOneChain(populatedDoc())); // findById re-read
      const result = await service.update('iss-1', 'org-1', { status: IssueStatus.RESOLVED } as any, false);
      expect(doc.status).toBe(IssueStatus.RESOLVED);
      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe('iss-1');
      expect(result.assignedTo).toEqual({ id: 'u-2', firstName: 'Sara', lastName: 'Diaz' });
    });
  });

  describe('addComment', () => {
    it('pushes the comment with the author id', async () => {
      const comments: any[] = [];
      const doc: any = { comments, save: jest.fn() };
      model.findOne.mockResolvedValue(doc);
      await service.addComment('iss-1', 'org-1', 'u-9', { body: 'hello' } as any, false);
      expect(comments[0]).toMatchObject({ authorId: 'u-9', body: 'hello' });
      expect(doc.save).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('soft-deletes by setting deletedAt', async () => {
      model.findOne.mockResolvedValue({ _id: 'iss-1' });
      await service.softDelete('iss-1', 'org-1', false);
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: 'iss-1' },
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });
});
