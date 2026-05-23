import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
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

/**
 * Unit tests for ProjectsService member management — org scoping, the duplicate
 * guard, and the last-member safeguard. Mongoose models are fully mocked.
 */
describe('ProjectsService — members', () => {
  let service: ProjectsService;
  let projectModel: any;
  let userModel: any;

  const makeProject = (members: any[]) => ({
    members,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    projectModel = { findOne: jest.fn() };
    userModel = { findOne: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Task.name), useValue: {} },
        { provide: getModelToken(Issue.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
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
