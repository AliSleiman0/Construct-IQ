import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { Phase } from './schemas/phase.schema';
import { ProjectStatus } from '../../common/enums';

/**
 * Unit tests for PhasesService — project + org scoping and not-found behaviour.
 * Mongoose model fully mocked; no database.
 */
describe('PhasesService', () => {
  let service: PhasesService;
  let model: any;

  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
      create: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PhasesService, { provide: getModelToken(Phase.name), useValue: model }],
    }).compile();
    service = moduleRef.get(PhasesService);
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
    it('persists with org + project and the given status', async () => {
      model.create.mockResolvedValue({ id: 'ph-1' });
      await service.create('proj-1', 'org-1', {
        name: 'Foundation',
        status: ProjectStatus.PLANNING,
      } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'proj-1',
          name: 'Foundation',
          status: ProjectStatus.PLANNING,
          order: 0,
          dependsOnPhaseIds: [],
        }),
      );
    });

    it('persists provided dependsOnPhaseIds', async () => {
      model.create.mockResolvedValue({ id: 'ph-2' });
      await service.create('proj-1', 'org-1', { name: 'Frame', dependsOnPhaseIds: ['ph-1'] } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ dependsOnPhaseIds: ['ph-1'] }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFound (project + org scoped) when missing', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(
        service.update('ph-1', 'proj-1', 'org-1', { name: 'X' } as any, false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'ph-1', projectId: 'proj-1', organizationId: 'org-1' });
    });

    it('applies provided fields and saves', async () => {
      const doc: any = { save: jest.fn(), toObject: () => doc };
      model.findOne.mockResolvedValue(doc);
      await service.update('ph-1', 'proj-1', 'org-1', { status: ProjectStatus.ACTIVE } as any, false);
      expect(doc.status).toBe(ProjectStatus.ACTIVE);
      expect(doc.save).toHaveBeenCalled();
    });

    it('toggles dependsOnPhaseIds (set then clear)', async () => {
      const doc: any = { dependsOnPhaseIds: [], save: jest.fn(), toObject: () => doc };
      model.findOne.mockResolvedValue(doc);
      await service.update('ph-2', 'proj-1', 'org-1', { dependsOnPhaseIds: ['ph-1'] } as any, false);
      expect(doc.dependsOnPhaseIds).toEqual(['ph-1']);
      await service.update('ph-2', 'proj-1', 'org-1', { dependsOnPhaseIds: [] } as any, false);
      expect(doc.dependsOnPhaseIds).toEqual([]);
    });
  });

  describe('remove', () => {
    it('throws NotFound when nothing was deleted', async () => {
      model.findOneAndDelete.mockResolvedValue(null);
      await expect(service.remove('ph-1', 'proj-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: 'ph-1', projectId: 'proj-1', organizationId: 'org-1' });
    });
  });
});
