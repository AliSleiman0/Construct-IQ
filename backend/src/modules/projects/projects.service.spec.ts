import { Test } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';
import { Task } from './schemas/task.schema';
import { User } from '../users/schemas/user.schema';
import { Issue } from '../issues/schemas/issue.schema';
import { DocumentEntity } from '../documents/schemas/document.schema';
import { CadDrawing } from './schemas/cad-drawing.schema';
import { ApsService } from '../aps/aps.service';
import { AuditService } from '../audit/audit.service';

/**
 * Unit tests for ProjectsService member management — org scoping, the duplicate
 * guard, and the last-member safeguard. Mongoose models are fully mocked.
 */
describe('ProjectsService — members', () => {
  let service: ProjectsService;
  let projectModel: any;
  let userModel: any;
  let connection: any;
  let auditLog: jest.Mock;
  let cascadeUpdateMany: jest.Mock;

  const makeProject = (members: any[]) => ({
    members,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    projectModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    userModel = { findOne: jest.fn() };
    auditLog = jest.fn().mockResolvedValue(undefined);
    cascadeUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    // A registered child model that has both projectId + deletedAt paths.
    const childModel = {
      schema: { path: (p: string) => (p === 'projectId' || p === 'deletedAt' ? {} : undefined) },
      updateMany: cascadeUpdateMany,
    };
    connection = { modelNames: () => ['Task'], model: () => childModel };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Task.name), useValue: {} },
        { provide: getModelToken(Issue.name), useValue: {} },
        { provide: getModelToken(DocumentEntity.name), useValue: {} },
        { provide: getModelToken(CadDrawing.name), useValue: {} },
        { provide: getConnectionToken(), useValue: connection },
        { provide: ApsService, useValue: {} },
        { provide: AuditService, useValue: { log: auditLog } },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  describe('softDelete (#34 cascade)', () => {
    it('throws NotFound when the project is absent (no cascade/audit)', async () => {
      projectModel.findOne.mockResolvedValue(null);
      await expect(service.softDelete('p-x', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(projectModel.updateOne).not.toHaveBeenCalled();
      expect(cascadeUpdateMany).not.toHaveBeenCalled();
    });

    it('soft-deletes the project, cascades to children, and audits', async () => {
      projectModel.findOne.mockResolvedValue({ _id: 'p-1', organizationId: 'org-1' });
      const res = await service.softDelete('p-1', 'org-1', false, 'actor-1');
      expect(projectModel.updateOne).toHaveBeenCalledWith({ _id: 'p-1' }, { deletedAt: expect.any(Date) });
      // Cascade hit the child model scoped by projectId.
      expect(cascadeUpdateMany).toHaveBeenCalledWith(
        { projectId: 'p-1', deletedAt: null },
        { deletedAt: expect.any(Date) },
      );
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'PROJECT', entityId: 'p-1', actorUserId: 'actor-1' }),
      );
      expect(res).toEqual({ message: 'Project deleted successfully' });
    });
  });

  describe('addMember', () => {
    it('throws Conflict when the user is already a member', async () => {
      projectModel.findOne.mockResolvedValue(makeProject([{ userId: 'u-1' }]));
      userModel.findOne.mockReturnValue({ lean: () => Promise.resolve({ _id: 'u-1' }) });
      await expect(
        service.addMember('p-1', 'org-1', { userId: 'u-1' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('pushes a new member and returns the hydrated row', async () => {
      const project = makeProject([{ userId: 'u-1' }]);
      projectModel.findOne.mockResolvedValue(project);
      userModel.findOne.mockReturnValue({
        lean: () => Promise.resolve({ _id: 'u-2', firstName: 'Sara', lastName: 'Diaz', email: 's@x.com' }),
      });
      const res = await service.addMember('p-1', 'org-1', { userId: 'u-2', role: 'Foreman' } as any);
      expect(project.members).toHaveLength(2);
      expect(project.save).toHaveBeenCalled();
      expect(res).toMatchObject({ id: 'u-2', role: 'Foreman', user: { firstName: 'Sara' } });
    });
  });

  describe('updateMember', () => {
    it('throws NotFound when the user is not a member', async () => {
      projectModel.findOne.mockResolvedValue(makeProject([{ userId: 'u-1' }]));
      await expect(
        service.updateMember('p-1', 'org-1', 'u-ghost', { role: 'Foreman' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the role, saves, and returns the hydrated row', async () => {
      const project = makeProject([{ userId: 'u-1', role: null, joinedAt: new Date() }]);
      projectModel.findOne.mockResolvedValue(project);
      userModel.findOne.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve({ _id: 'u-1', firstName: 'Sara', lastName: 'Diaz', email: 's@x.com' }),
        }),
      });
      const res = await service.updateMember('p-1', 'org-1', 'u-1', { role: 'Foreman' });
      expect(project.members[0].role).toBe('Foreman');
      expect(project.save).toHaveBeenCalled();
      expect(res).toMatchObject({ id: 'u-1', role: 'Foreman', user: { firstName: 'Sara' } });
    });

    it('clears the role when role is omitted', async () => {
      const project = makeProject([{ userId: 'u-1', role: 'Foreman', joinedAt: new Date() }]);
      projectModel.findOne.mockResolvedValue(project);
      userModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
      const res = await service.updateMember('p-1', 'org-1', 'u-1', {});
      expect(project.members[0].role).toBeNull();
      expect(res.user).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('throws NotFound when the user is not a member', async () => {
      projectModel.findOne.mockResolvedValue(makeProject([{ userId: 'u-1' }, { userId: 'u-2' }]));
      await expect(service.removeMember('p-1', 'org-1', 'u-ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to remove the last remaining member (400)', async () => {
      const project = makeProject([{ userId: 'u-1' }]);
      projectModel.findOne.mockResolvedValue(project);
      await expect(service.removeMember('p-1', 'org-1', 'u-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(project.save).not.toHaveBeenCalled();
    });

    it('removes a member when more than one remains', async () => {
      const project = makeProject([{ userId: 'u-1' }, { userId: 'u-2' }]);
      projectModel.findOne.mockResolvedValue(project);
      await service.removeMember('p-1', 'org-1', 'u-2');
      expect(project.members).toEqual([{ userId: 'u-1' }]);
      expect(project.save).toHaveBeenCalled();
    });
  });
});
