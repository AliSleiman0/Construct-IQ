import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { Issue } from './schemas/issue.schema';
import { IssueStatus, IssueSeverity } from '../../common/enums';

/**
 * Unit tests for IssuesService — multi-tenancy scoping + the populate/flatten
 * mapping that turns ref ids into `createdBy` / `assignedTo` / `project` /
 * comment `author` objects. The Mongoose model is fully mocked; no DB.
 */
describe('IssuesService', () => {
  let service: IssuesService;
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
    };
    const moduleRef = await Test.createTestingModule({
      providers: [IssuesService, { provide: getModelToken(Issue.name), useValue: model }],
    }).compile();
    service = moduleRef.get(IssuesService);
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

    it('adds projectId / status / severity filters when provided', async () => {
      await service.findAll('org-1', false, 'proj-1', IssueStatus.OPEN, 'HIGH');
      expect(model.find).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: IssueStatus.OPEN,
        severity: 'HIGH',
      });
    });

    it('flattens populated refs into id + name objects', async () => {
      model.find.mockReturnValue(findChain([populatedDoc()]));
      const [issue] = await service.findAll('org-1', false);
      expect(issue.id).toBe('iss-1');
      expect(issue.projectId).toBe('proj-1');
      expect(issue.project).toEqual({ id: 'proj-1', name: 'Tower Heights' });
      expect(issue.createdById).toBe('u-1');
      expect(issue.createdBy).toEqual({ id: 'u-1', firstName: 'Pete', lastName: 'Williams' });
      expect(issue.assignedToId).toBe('u-2');
      expect(issue.assignedTo).toEqual({ id: 'u-2', firstName: 'Sara', lastName: 'Diaz' });
      expect(issue.comments[0]).toMatchObject({
        id: 'c-1',
        authorId: 'u-1',
        author: { id: 'u-1', firstName: 'Pete', lastName: 'Williams' },
        body: 'On it',
      });
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
