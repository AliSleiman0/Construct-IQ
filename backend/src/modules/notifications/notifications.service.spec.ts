import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';

describe('NotificationsService.notifyMany (#35)', () => {
  let service: NotificationsService;
  let model: any;

  beforeEach(async () => {
    model = { create: jest.fn().mockResolvedValue({}) };
    const ref = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: model },
      ],
    }).compile();
    service = ref.get(NotificationsService);
  });

  it('creates one notification per unique, truthy recipient', async () => {
    await service.notifyMany('org-1', ['a', 'b', 'a', null, undefined, ''], {
      title: 'T',
      message: 'M',
      type: 'info',
    });
    expect(model.create).toHaveBeenCalledTimes(2);
    const userIds = model.create.mock.calls.map((c: any) => c[0].userId).sort();
    expect(userIds).toEqual(['a', 'b']);
    expect(model.create.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1', title: 'T', isRead: false });
  });

  it('creates nothing when there are no valid recipients', async () => {
    await service.notifyMany('org-1', [null, undefined, ''], { title: 'T', message: 'M', type: 'info' });
    expect(model.create).not.toHaveBeenCalled();
  });
});
