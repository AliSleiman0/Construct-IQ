import { Test } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization } from './schemas/organization.schema';
import { User } from '../users/schemas/user.schema';
import { Role } from '../users/schemas/role.schema';
import { Permission } from '../users/schemas/permission.schema';
import { Project } from '../projects/schemas/project.schema';
import { AiPlan } from '../ai-plans/schemas/ai-plan.schema';
import { AuditService } from '../audit/audit.service';

/**
 * #34 — deleting an organization soft-deletes it and cascade soft-deletes every
 * org-scoped, soft-deletable entity. Collections without the plugin are skipped.
 */
describe('OrganizationsService.softDelete (#34 cascade)', () => {
  let service: OrganizationsService;
  let orgModel: any;
  let auditLog: jest.Mock;
  let cascadeUpdateMany: jest.Mock;

  beforeEach(async () => {
    orgModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    auditLog = jest.fn().mockResolvedValue(undefined);
    cascadeUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 5 });
    const childModel = {
      schema: { path: (p: string) => (p === 'organizationId' || p === 'deletedAt' ? {} : undefined) },
      updateMany: cascadeUpdateMany,
    };
    const connection = { modelNames: () => ['User'], model: () => childModel };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getModelToken(Organization.name), useValue: orgModel },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Role.name), useValue: {} },
        { provide: getModelToken(Permission.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: {} },
        { provide: getModelToken(AiPlan.name), useValue: {} },
        { provide: getConnectionToken(), useValue: connection },
        { provide: AuditService, useValue: { log: auditLog } },
      ],
    }).compile();
    service = moduleRef.get(OrganizationsService);
  });

  it('throws NotFound when the org is absent (no cascade/audit)', async () => {
    orgModel.findOne.mockResolvedValue(null);
    await expect(service.softDelete('o-x')).rejects.toBeInstanceOf(NotFoundException);
    expect(orgModel.updateOne).not.toHaveBeenCalled();
    expect(cascadeUpdateMany).not.toHaveBeenCalled();
  });

  it('soft-deletes the org, cascades to org-scoped data, and audits', async () => {
    orgModel.findOne.mockResolvedValue({ _id: 'o-1', name: 'Acme' });
    const res = await service.softDelete('o-1', 'sa-1');
    expect(orgModel.updateOne).toHaveBeenCalledWith({ _id: 'o-1' }, { deletedAt: expect.any(Date) });
    expect(cascadeUpdateMany).toHaveBeenCalledWith(
      { organizationId: 'o-1', deletedAt: null },
      { deletedAt: expect.any(Date) },
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', entityType: 'ORGANIZATION', entityId: 'o-1', actorUserId: 'sa-1' }),
    );
    expect(res).toEqual({ message: 'Organization deleted successfully' });
  });
});
