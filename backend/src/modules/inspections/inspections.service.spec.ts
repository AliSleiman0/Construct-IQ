import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { Inspection } from './schemas/inspection.schema';
import { Project } from '../projects/schemas/project.schema';
import { InspectionStatus, InspectionType } from '../../common/enums';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IssuesService } from '../issues/issues.service';

/**
 * Unit tests for InspectionsService — org + project-membership scoping and the
 * populate/flatten mapping. Models are fully mocked; no DB.
 */
describe('InspectionsService', () => {
  let service: InspectionsService;
  let model: any;
  let projectModel: any;
  let auditLog: jest.Mock;
  let notifyMany: jest.Mock;
  let issueCreate: jest.Mock;

  // find(...).sort(...).populate(...).lean()
  const findChain = (result: any[]) => ({
    sort: () => ({ populate: () => ({ lean: () => Promise.resolve(result) }) }),
  });
  const findOneChain = (result: any) => ({ populate: () => ({ lean: () => Promise.resolve(result) }) });
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  const populatedDoc = () => ({
    _id: 'insp-1',
    organizationId: 'org-1',
    title: 'Rebar inspection',
    type: InspectionType.STRUCTURAL,
    status: InspectionStatus.SCHEDULED,
    projectId: { _id: 'p1', name: 'Tower Heights' },
    inspectorId: { _id: 'u-2', firstName: 'Sebastian', lastName: 'Diaz' },
    createdById: { _id: 'u-1', firstName: 'Pete', lastName: 'Williams' },
  });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    projectModel = { find: jest.fn().mockReturnValue(projectFindChain([])) };
    auditLog = jest.fn().mockResolvedValue(undefined);
    notifyMany = jest.fn().mockResolvedValue(undefined);
    issueCreate = jest.fn().mockResolvedValue({ _id: 'iss-new' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: getModelToken(Inspection.name), useValue: model },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: AuditService, useValue: { log: auditLog } },
        { provide: NotificationsService, useValue: { notifyMany } },
        { provide: IssuesService, useValue: { create: issueCreate } },
      ],
    }).compile();
    service = moduleRef.get(InspectionsService);
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

    it('restricts a non-orgWide viewer to their member projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
      await service.findAll('org-1', false, {}, { userId: 'eng-1', orgWide: false });
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] } });
    });

    it('does NOT member-scope an orgWide viewer (manage:inspections)', async () => {
      await service.findAll('org-1', false, {}, { userId: 'pm-1', orgWide: true });
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(model.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('returns [] when the viewer belongs to no projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([]));
      const res = await service.findAll('org-1', false, {}, { userId: 'eng-1', orgWide: false });
      expect(res).toEqual([]);
      expect(model.find).not.toHaveBeenCalled();
    });

    it('flattens populated project + inspector into id/name objects', async () => {
      model.find.mockReturnValue(findChain([populatedDoc()]));
      const [insp] = await service.findAll('org-1', false);
      expect(insp.id).toBe('insp-1');
      expect(insp.project).toEqual({ id: 'p1', name: 'Tower Heights' });
      expect(insp.inspector).toEqual({ id: 'u-2', firstName: 'Sebastian', lastName: 'Diaz' });
    });
  });

  describe('findById', () => {
    it('throws NotFound when missing', async () => {
      model.findOne.mockReturnValue(findOneChain(null));
      await expect(service.findById('x', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    const makeDoc = (over: any = {}) => {
      const doc: any = {
        _id: 'insp-1', organizationId: 'org-1', projectId: 'p-1', title: 'Rebar check',
        status: InspectionStatus.SCHEDULED, inspectorId: 'inspector-1', createdById: 'creator-1',
        notes: null, ...over,
      };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };

    it('throws NotFound when the inspection is not in the org', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(service.update('x', 'org-1', { status: InspectionStatus.PASSED }, false)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('on FAILED: audits the result, notifies, and auto-raises a linked Issue', async () => {
      model.findOne
        .mockResolvedValueOnce(makeDoc())
        .mockReturnValueOnce(findOneChain({ _id: 'insp-1', status: 'FAILED' }));
      await service.update('insp-1', 'org-1', { status: InspectionStatus.FAILED }, false, 'actor-1');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESULT', entityType: 'INSPECTION', entityId: 'insp-1' }),
      );
      expect(notifyMany).toHaveBeenCalledWith('org-1', expect.arrayContaining(['creator-1', 'inspector-1']),
        expect.objectContaining({ type: 'error' }));
      expect(issueCreate).toHaveBeenCalledWith('org-1', 'actor-1',
        expect.objectContaining({ projectId: 'p-1', inspectionId: 'insp-1' }));
    });

    it('on PASSED: audits + notifies but does NOT raise an Issue', async () => {
      model.findOne
        .mockResolvedValueOnce(makeDoc())
        .mockReturnValueOnce(findOneChain({ _id: 'insp-1', status: 'PASSED' }));
      await service.update('insp-1', 'org-1', { status: InspectionStatus.PASSED }, false, 'actor-1');
      expect(notifyMany).toHaveBeenCalledWith('org-1', expect.any(Array),
        expect.objectContaining({ type: 'success' }));
      expect(issueCreate).not.toHaveBeenCalled();
    });

    it('does not emit when the status is unchanged', async () => {
      model.findOne
        .mockResolvedValueOnce(makeDoc({ status: InspectionStatus.SCHEDULED }))
        .mockReturnValueOnce(findOneChain({ _id: 'insp-1' }));
      await service.update('insp-1', 'org-1', { notes: 'tweak' }, false, 'actor-1');
      expect(auditLog).not.toHaveBeenCalled();
      expect(notifyMany).not.toHaveBeenCalled();
      expect(issueCreate).not.toHaveBeenCalled();
    });
  });
});
