import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RfisService } from './rfis.service';
import { Rfi } from './schemas/rfi.schema';
import { Project } from '../projects/schemas/project.schema';
import { RfiStatus, RfiDiscipline } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const auditNotifyProviders = () => [
  { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
  { provide: NotificationsService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
];

/**
 * Unit tests for RfisService — org + project-membership scoping, the populate/
 * flatten mapping, RFI numbering, and the manager answer mutation. Models mocked.
 */
describe('RfisService', () => {
  let service: RfisService;
  let model: any;
  let projectModel: any;

  const findChain = (result: any[]) => ({
    sort: () => ({ populate: () => ({ lean: () => Promise.resolve(result) }) }),
  });
  const findOneChain = (result: any) => ({ populate: () => ({ lean: () => Promise.resolve(result) }) });
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  const pm: JwtPayload = { sub: 'pm-1', email: 'p@x.com', organizationId: 'org-1', isSuperAdmin: false };

  const populatedDoc = () => ({
    _id: 'rfi-1',
    organizationId: 'org-1',
    number: 'RFI-0001',
    subject: 'Beam clash at grid C3',
    question: 'Which beam takes priority?',
    discipline: RfiDiscipline.STRUCTURAL,
    status: RfiStatus.OPEN,
    projectId: { _id: 'p1', name: 'Tower Heights' },
    respondentId: { _id: 'u-2', firstName: 'Anna', lastName: 'Architect' },
    createdById: { _id: 'u-1', firstName: 'Site', lastName: 'Engineer' },
    answeredById: null,
  });

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnValue(findChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    projectModel = { find: jest.fn().mockReturnValue(projectFindChain([])) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RfisService,
        { provide: getModelToken(Rfi.name), useValue: model },
        { provide: getModelToken(Project.name), useValue: projectModel },
        ...auditNotifyProviders(),
      ],
    }).compile();
    service = moduleRef.get(RfisService);
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

    it('does NOT member-scope an orgWide viewer (manage:rfis)', async () => {
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

    it('flattens populated project + respondent into id/name objects', async () => {
      model.find.mockReturnValue(findChain([populatedDoc()]));
      const [rfi] = await service.findAll('org-1', false);
      expect(rfi.id).toBe('rfi-1');
      expect(rfi.project).toEqual({ id: 'p1', name: 'Tower Heights' });
      expect(rfi.respondent).toEqual({ id: 'u-2', firstName: 'Anna', lastName: 'Architect' });
    });
  });

  describe('create', () => {
    it('generates a per-org RFI number, forces OPEN, sets createdById', async () => {
      model.countDocuments.mockResolvedValue(4);
      model.create.mockResolvedValue({ _id: 'rfi-5' });
      model.findOne.mockReturnValue(findOneChain({ _id: 'rfi-5', number: 'RFI-0005' }));
      await service.create('org-1', 'eng-1', { projectId: 'p1', subject: 'S', question: 'Q' } as any);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          createdById: 'eng-1',
          number: 'RFI-0005',
          status: RfiStatus.OPEN,
          projectId: 'p1',
        }),
      );
    });
  });

  describe('answer', () => {
    it('records the answer + answeredById + answeredAt and flips to ANSWERED', async () => {
      const doc: any = {
        _id: 'rfi-1', organizationId: 'org-1', status: RfiStatus.OPEN,
        answer: null, answeredById: null, answeredAt: null, save: jest.fn().mockResolvedValue(true),
      };
      model.findOne.mockResolvedValueOnce(doc).mockReturnValueOnce(findOneChain({ _id: 'rfi-1' }));
      await service.answer('rfi-1', pm, { answer: 'Use grade 60 rebar' });
      expect(doc.status).toBe(RfiStatus.ANSWERED);
      expect(doc.answeredById).toBe('pm-1');
      expect(doc.answeredAt).toBeInstanceOf(Date);
      expect(doc.answer).toBe('Use grade 60 rebar');
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFound when the RFI is not in the org', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(service.answer('x', pm, { answer: 'a' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('edits fields + status but never the answer', async () => {
      const doc: any = {
        _id: 'rfi-1', organizationId: 'org-1', subject: 'old', status: RfiStatus.OPEN,
        answer: null, save: jest.fn().mockResolvedValue(true),
      };
      model.findOne.mockResolvedValueOnce(doc).mockReturnValueOnce(findOneChain({ _id: 'rfi-1' }));
      await service.update('rfi-1', 'org-1', { subject: 'new', status: RfiStatus.CLOSED } as any, false);
      expect(doc.subject).toBe('new');
      expect(doc.status).toBe(RfiStatus.CLOSED);
      expect(doc.answer).toBeNull();
    });

    it('throws NotFound when the RFI is not in the org', async () => {
      model.findOne.mockResolvedValue(null);
      await expect(service.update('x', 'org-1', { subject: 'x' } as any, false)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

/**
 * #28 — RFI status via the generic update is transition-guarded. ANSWERED is
 * reachable only through the dedicated answer() endpoint (stamps answeredById/At);
 * close/reopen are self-service.
 */
describe('RfisService — status transition guard (#28)', () => {
  let service: RfisService;
  let model: any;
  let auditLog: jest.Mock;
  let notifyMany: jest.Mock;

  const findOnePopulate = (result: any) => ({ populate: () => ({ lean: () => Promise.resolve(result) }) });

  const makeRfi = (status: RfiStatus, over: any = {}) => {
    const doc: any = {
      _id: 'rfi-1', organizationId: 'org-1', projectId: 'p-1', subject: 'Beam detail',
      createdById: 'creator-1', status, ...over,
    };
    doc.save = jest.fn().mockResolvedValue(doc);
    return doc;
  };

  beforeEach(async () => {
    model = { findOne: jest.fn() };
    auditLog = jest.fn().mockResolvedValue(undefined);
    notifyMany = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        RfisService,
        { provide: getModelToken(Rfi.name), useValue: model },
        { provide: getModelToken(Project.name), useValue: { find: jest.fn() } },
        { provide: AuditService, useValue: { log: auditLog } },
        { provide: NotificationsService, useValue: { notifyMany } },
      ],
    }).compile();
    service = moduleRef.get(RfisService);
  });

  it('answer(): audits + notifies the raiser (#35)', async () => {
    const doc = makeRfi(RfiStatus.OPEN);
    model.findOne
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(findOnePopulate({ _id: 'rfi-1', status: 'ANSWERED' }));
    const user: any = { sub: 'answerer-1', organizationId: 'org-1', isSuperAdmin: false };
    await service.answer('rfi-1', user, { answer: 'See detail 4.' } as any);
    expect(doc.status).toBe(RfiStatus.ANSWERED);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ANSWER', entityType: 'RFI', entityId: 'rfi-1' }),
    );
    expect(notifyMany).toHaveBeenCalledWith('org-1', ['creator-1'],
      expect.objectContaining({ type: 'success', entityType: 'RFI' }));
  });

  it('rejects OPEN → ANSWERED via generic update (must use the answer endpoint)', async () => {
    const doc = makeRfi(RfiStatus.OPEN);
    model.findOne.mockResolvedValueOnce(doc);
    await expect(
      service.update('rfi-1', 'org-1', { status: RfiStatus.ANSWERED } as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('allows ANSWERED → CLOSED (self-service)', async () => {
    const doc = makeRfi(RfiStatus.ANSWERED);
    model.findOne
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(findOnePopulate({ _id: 'rfi-1', status: 'CLOSED' }));
    await service.update('rfi-1', 'org-1', { status: RfiStatus.CLOSED } as any, false);
    expect(doc.status).toBe(RfiStatus.CLOSED);
    expect(doc.save).toHaveBeenCalled();
  });
});
