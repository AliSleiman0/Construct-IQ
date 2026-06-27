import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from '../projects/schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { TaskStatus, TaskPriority } from '../../common/enums';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Unit tests for TasksService — multi-tenancy scoping + not-found behaviour.
 * The Mongoose model is fully mocked; no database is touched.
 */
describe('TasksService', () => {
  let service: TasksService;
  let model: any;
  let projectModel: any;
  let auditLog: jest.Mock;
  let notifyMany: jest.Mock;

  // find(...).sort(...).lean() chain
  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  // find(...).select(...).lean() chain (overdue sweep)
  const selectChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });
  // projectModel.find(...).select(...).lean() — member-project lookup
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      updateMany: jest.fn().mockResolvedValue({ acknowledged: true }),
      bulkWrite: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
    };
    projectModel = {
      find: jest.fn().mockReturnValue(projectFindChain([])),
    };
    auditLog = jest.fn().mockResolvedValue(undefined);
    notifyMany = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: model },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: AuditService, useValue: { log: auditLog } },
        { provide: NotificationsService, useValue: { notifyMany } },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
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

    it('adds projectId / assignedToId / status filters when provided', async () => {
      await service.findAll('org-1', false, 'proj-1', 'user-9', TaskStatus.IN_PROGRESS);
      expect(model.find).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: 'proj-1',
        assignedToId: 'user-9',
        status: TaskStatus.IN_PROGRESS,
      });
    });

    it('restricts a non-orgWide viewer to their member projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
      await service.findAll('org-1', false, undefined, undefined, undefined, {
        userId: 'eng-1',
        orgWide: false,
      });
      expect(model.find).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: { $in: ['p1', 'p2'] },
      });
    });

    it('does NOT member-scope an orgWide viewer', async () => {
      await service.findAll('org-1', false, undefined, undefined, undefined, {
        userId: 'pm-1',
        orgWide: true,
      });
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('returns [] when the viewer belongs to no projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([]));
      const res = await service.findAll('org-1', false, undefined, undefined, undefined, {
        userId: 'eng-1',
        orgWide: false,
      });
      expect(res).toEqual([]);
      expect(model.find).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('throws NotFound when the task is missing (or belongs to another org)', async () => {
      // findById chains .populate(...).lean()
      model.findOne.mockReturnValue({ populate: () => ({ lean: () => Promise.resolve(null) }) });
      await expect(service.findById('t-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 't-1', organizationId: 'org-1' });
    });

    it('flattens populated comment authors into a comments[].author object', async () => {
      const doc = {
        _id: 't-1',
        title: 'Pour foundation',
        comments: [
          { _id: 'c-1', body: 'looks good', authorId: { _id: 'u-9', firstName: 'Ada', lastName: 'Lovelace' } },
        ],
      };
      model.findOne.mockReturnValue({ populate: () => ({ lean: () => Promise.resolve(doc) }) });
      const result = await service.findById('t-1', 'org-1', false);
      expect(result.id).toBe('t-1');
      expect(result.comments[0]).toEqual(
        expect.objectContaining({
          id: 'c-1',
          body: 'looks good',
          authorId: 'u-9',
          author: { id: 'u-9', firstName: 'Ada', lastName: 'Lovelace' },
        }),
      );
    });
  });

  describe('create', () => {
    it('persists with the caller org + creator and defaults status to TODO', async () => {
      model.create.mockResolvedValue({ id: 't-1' });
      await service.create('org-1', 'user-1', {
        projectId: 'proj-1',
        title: 'Pour foundation',
        priority: TaskPriority.MEDIUM,
      } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          createdById: 'user-1',
          projectId: 'proj-1',
          title: 'Pour foundation',
          status: TaskStatus.TODO,
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFound (org-scoped) when the task is not found', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(
        service.update('t-1', 'org-1', { status: TaskStatus.DONE } as any, false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 't-1', organizationId: 'org-1' });
    });

    it('stamps completedAt when status becomes DONE', async () => {
      const doc: any = { completedAt: null, save: jest.fn(), toObject: () => doc };
      model.findOne.mockResolvedValue(doc);
      await service.update('t-1', 'org-1', { status: TaskStatus.DONE } as any, false);
      expect(doc.status).toBe(TaskStatus.DONE);
      expect(doc.completedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
    });

    it('clears completedAt when moving away from DONE', async () => {
      const doc: any = { completedAt: new Date(), save: jest.fn(), toObject: () => doc };
      model.findOne.mockResolvedValue(doc);
      await service.update('t-1', 'org-1', { status: TaskStatus.IN_PROGRESS } as any, false);
      expect(doc.completedAt).toBeNull();
    });
  });

  describe('reorder', () => {
    it('writes position=index + status for each id, org-scoped', async () => {
      await service.reorder('org-1', false, TaskStatus.TODO, ['c', 'b', 'a']);
      expect(model.bulkWrite).toHaveBeenCalledWith([
        { updateOne: { filter: { _id: 'c', organizationId: 'org-1' }, update: { $set: { position: 0, status: TaskStatus.TODO } } } },
        { updateOne: { filter: { _id: 'b', organizationId: 'org-1' }, update: { $set: { position: 1, status: TaskStatus.TODO } } } },
        { updateOne: { filter: { _id: 'a', organizationId: 'org-1' }, update: { $set: { position: 2, status: TaskStatus.TODO } } } },
      ]);
    });

    it('does NOT scope by org for super admins', async () => {
      await service.reorder('org-1', true, TaskStatus.TODO, ['a']);
      expect(model.bulkWrite).toHaveBeenCalledWith([
        { updateOne: { filter: { _id: 'a' }, update: { $set: { position: 0, status: TaskStatus.TODO } } } },
      ]);
    });

    it('stamps completedAt only where unset when reordering into DONE', async () => {
      await service.reorder('org-1', false, TaskStatus.DONE, ['a', 'b']);
      expect(model.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['a', 'b'] }, organizationId: 'org-1', completedAt: null },
        { $set: { completedAt: expect.any(Date) } },
      );
    });

    it('clears completedAt for any non-DONE column', async () => {
      await service.reorder('org-1', false, TaskStatus.IN_PROGRESS, ['a', 'b']);
      expect(model.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['a', 'b'] }, organizationId: 'org-1' },
        { $set: { completedAt: null } },
      );
    });
  });

  describe('addComment', () => {
    it('throws NotFound (org-scoped) when the task is not found', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(
        service.addComment('t-1', 'org-1', 'u-1', { body: 'hi' } as any, false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 't-1', organizationId: 'org-1' });
    });

    it('pushes the comment, saves, and returns the new comment', async () => {
      const comments: any[] = [];
      const doc: any = { comments, save: jest.fn() };
      model.findOne.mockResolvedValue(doc);
      const result = await service.addComment('t-1', 'org-1', 'u-9', { body: 'looks good' } as any, false);
      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0]).toEqual({ authorId: 'u-9', body: 'looks good' });
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual({ authorId: 'u-9', body: 'looks good' });
    });
  });

  describe('softDelete', () => {
    it('throws NotFound when missing and never writes', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(service.softDelete('t-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('soft-deletes by setting deletedAt', async () => {
      model.findOne.mockResolvedValue({ _id: 't-1' });
      await service.softDelete('t-1', 'org-1', false);
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: 't-1' },
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('drops the deleted task from sibling dependency lists (#34)', async () => {
      model.findOne.mockResolvedValue({ _id: 't-1' });
      await service.softDelete('t-1', 'org-1', false);
      expect(model.updateMany).toHaveBeenCalledWith(
        { dependsOnTaskIds: 't-1' },
        { $pull: { dependsOnTaskIds: 't-1' } },
      );
    });
  });

  describe('events (#35)', () => {
    const makeTask = (over: any = {}) => {
      const doc: any = {
        _id: 't-1', organizationId: 'org-1', projectId: 'p-1', status: TaskStatus.TODO,
        title: 'Pour slab', createdById: 'creator-1', assignedToId: 'assignee-1', completedAt: null,
        comments: [], ...over,
      };
      doc.save = jest.fn().mockResolvedValue(doc);
      doc.toObject = jest.fn().mockReturnValue(doc);
      return doc;
    };

    it('audits + notifies creator/assignee on a status change to DONE (actor excluded)', async () => {
      model.findOne.mockResolvedValue(makeTask());
      await service.update('t-1', 'org-1', { status: TaskStatus.DONE } as any, false, 'assignee-1');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'TASK', entityId: 't-1' }),
      );
      // assignee-1 is the actor → excluded; only creator-1 remains.
      expect(notifyMany).toHaveBeenCalledWith('org-1', ['creator-1'],
        expect.objectContaining({ type: 'success', entityType: 'TASK' }));
    });

    it('does not emit when the status is unchanged', async () => {
      model.findOne.mockResolvedValue(makeTask({ status: TaskStatus.IN_PROGRESS }));
      await service.update('t-1', 'org-1', { progress: 50 } as any, false, 'u-9');
      expect(auditLog).not.toHaveBeenCalled();
      expect(notifyMany).not.toHaveBeenCalled();
    });

    it('audits + notifies collaborators on a comment (author excluded)', async () => {
      model.findOne.mockResolvedValue(makeTask());
      await service.addComment('t-1', 'org-1', 'creator-1', { body: 'hi' } as any, false);
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMENT', entityType: 'TASK' }),
      );
      // author is creator-1 → excluded; only assignee-1 remains.
      expect(notifyMany).toHaveBeenCalledWith('org-1', ['assignee-1'],
        expect.objectContaining({ entityType: 'TASK' }));
    });
  });

  describe('notifyOverdueTasks cron (#35)', () => {
    it('notifies assignees of overdue tasks once and stamps overdueNotifiedAt', async () => {
      model.find.mockReturnValue(selectChain([
        { _id: 't-1', title: 'Late A', organizationId: 'org-1', assignedToId: 'a-1' },
        { _id: 't-2', title: 'Late B', organizationId: 'org-2', assignedToId: 'a-2' },
      ]));
      const res = await service.notifyOverdueTasks();
      expect(res).toEqual({ notified: 2 });
      expect(notifyMany).toHaveBeenCalledWith('org-1', ['a-1'], expect.objectContaining({ type: 'warning' }));
      expect(model.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['t-1', 't-2'] } },
        { overdueNotifiedAt: expect.any(Date) },
      );
    });

    it('no-ops when nothing is overdue', async () => {
      model.find.mockReturnValue(selectChain([]));
      const res = await service.notifyOverdueTasks();
      expect(res).toEqual({ notified: 0 });
      expect(notifyMany).not.toHaveBeenCalled();
      expect(model.updateMany).not.toHaveBeenCalled();
    });
  });
});
