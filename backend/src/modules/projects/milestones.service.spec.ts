import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { Milestone } from './schemas/milestone.schema';
import { MilestoneStatus } from '../../common/enums';

/**
 * Unit tests for MilestonesService — project + org scoping, defaults, completedDate.
 * Mongoose model fully mocked; no database.
 */
describe('MilestonesService', () => {
  let service: MilestonesService;
  let model: any;

  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [MilestonesService, { provide: getModelToken(Milestone.name), useValue: model }],
    }).compile();
    service = moduleRef.get(MilestonesService);
  });

  describe('findAll', () => {
    it('scopes by projectId + organizationId for non-super-admins', async () => {
      await service.findAll('proj-1', 'org-1', false);
      expect(model.find).toHaveBeenCalledWith({ projectId: 'proj-1', organizationId: 'org-1' });
    });

    it('omits org filter for super admins', async () => {
      await service.findAll('proj-1', 'org-1', true);
      expect(model.find).toHaveBeenCalledWith({ projectId: 'proj-1' });
    });
  });

  describe('create', () => {
    it('persists with org + project and defaults percentComplete to 0', async () => {
      model.create.mockResolvedValue({ id: 'ms-1' });
      await service.create('proj-1', 'org-1', {
        name: 'Permit Approval',
        status: MilestoneStatus.PENDING,
      } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'proj-1',
          name: 'Permit Approval',
          status: MilestoneStatus.PENDING,
          percentComplete: 0,
          dependsOnMilestoneIds: [],
        }),
      );
    });

    it('persists provided dependsOnMilestoneIds', async () => {
      model.create.mockResolvedValue({ id: 'ms-2' });
      await service.create('proj-1', 'org-1', { name: 'Handover', dependsOnMilestoneIds: ['ms-1'] } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ dependsOnMilestoneIds: ['ms-1'] }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFound (project + org scoped) when missing', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(
        service.update('ms-1', 'proj-1', 'org-1', { name: 'X' } as any, false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'ms-1', projectId: 'proj-1', organizationId: 'org-1' });
    });

    it('stamps completedDate when status becomes COMPLETED', async () => {
      const doc: any = { completedDate: null, save: jest.fn(), toObject: () => doc };
      model.findOne.mockResolvedValue(doc);
      await service.update('ms-1', 'proj-1', 'org-1', {
        status: MilestoneStatus.COMPLETED,
        percentComplete: 100,
      } as any, false);
      expect(doc.status).toBe(MilestoneStatus.COMPLETED);
      expect(doc.percentComplete).toBe(100);
      expect(doc.completedDate).toBeInstanceOf(Date);
    });

    it('toggles dependsOnMilestoneIds (set then clear)', async () => {
      const doc: any = { dependsOnMilestoneIds: [], save: jest.fn(), toObject: () => doc };
      model.findOne.mockResolvedValue(doc);
      await service.update('ms-2', 'proj-1', 'org-1', { dependsOnMilestoneIds: ['ms-1'] } as any, false);
      expect(doc.dependsOnMilestoneIds).toEqual(['ms-1']);
      await service.update('ms-2', 'proj-1', 'org-1', { dependsOnMilestoneIds: [] } as any, false);
      expect(doc.dependsOnMilestoneIds).toEqual([]);
    });
  });

  describe('remove', () => {
    it('throws NotFound when nothing was deleted', async () => {
      model.findOneAndDelete.mockResolvedValue(null);
      await expect(service.remove('ms-1', 'proj-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: 'ms-1', projectId: 'proj-1', organizationId: 'org-1' });
    });

    it('drops the deleted milestone from sibling dependency lists (#34)', async () => {
      model.findOneAndDelete.mockResolvedValue({ _id: 'ms-1' });
      await service.remove('ms-1', 'proj-1', 'org-1', false);
      expect(model.updateMany).toHaveBeenCalledWith(
        { dependsOnMilestoneIds: 'ms-1' },
        { $pull: { dependsOnMilestoneIds: 'ms-1' } },
      );
    });
  });
});
