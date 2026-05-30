import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnitsService } from './units.service';
import { Unit } from './schemas/unit.schema';
import { Payment } from './schemas/payment.schema';
import { ProgressPhoto } from './schemas/progress-photo.schema';
import { Project } from '../projects/schemas/project.schema';

/**
 * Unit tests for UnitsService.findPhotos — org + project-membership scoping of
 * progress photos (the leak fix). Other units/payments methods are unchanged.
 * All models fully mocked; no DB.
 */
describe('UnitsService.findPhotos', () => {
  let service: UnitsService;
  let photoModel: any;
  let projectModel: any;

  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    photoModel = { find: jest.fn().mockReturnValue(findChain([])) };
    projectModel = { find: jest.fn().mockReturnValue(projectFindChain([])) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getModelToken(Unit.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: {} },
        { provide: getModelToken(ProgressPhoto.name), useValue: photoModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
      ],
    }).compile();
    service = moduleRef.get(UnitsService);
  });

  it('scopes by organizationId for non-super-admins', async () => {
    await service.findPhotos('org-1', false);
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('does NOT scope by org for super admins', async () => {
    await service.findPhotos('org-1', true);
    expect(photoModel.find).toHaveBeenCalledWith({});
  });

  it('restricts a non-orgWide viewer to their member projects', async () => {
    projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
    await service.findPhotos('org-1', false, undefined, { userId: 'eng-1', orgWide: false });
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] } });
  });

  it('does NOT member-scope an orgWide viewer (manage:documents)', async () => {
    await service.findPhotos('org-1', false, undefined, { userId: 'pm-1', orgWide: true });
    expect(projectModel.find).not.toHaveBeenCalled();
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('matches nothing when a non-orgWide viewer requests a non-member project', async () => {
    projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
    await service.findPhotos('org-1', false, 'p9', { userId: 'eng-1', orgWide: false });
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: [] } });
  });

  it('returns [] when the viewer belongs to no projects', async () => {
    projectModel.find.mockReturnValue(projectFindChain([]));
    const res = await service.findPhotos('org-1', false, undefined, { userId: 'eng-1', orgWide: false });
    expect(res).toEqual([]);
    expect(photoModel.find).not.toHaveBeenCalled();
  });
});
