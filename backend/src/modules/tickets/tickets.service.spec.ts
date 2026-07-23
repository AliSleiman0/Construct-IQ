import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket } from './schemas/ticket.schema';

/**
 * Reporter scoping.
 *
 * CLIENT holds `read:tickets` so a customer can follow their own support
 * cases — not so they can read the whole company's support queue. Anyone
 * without `manage:tickets` is pinned to `reporterId === their own id`.
 */
describe('TicketsService reporter scoping', () => {
  let service: TicketsService;
  let ticketModel: any;

  const sortLean = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  const findOneLean = (result: any) => ({ lean: () => Promise.resolve(result) });

  const customer = { userId: 'client-1', canTriage: false };
  const agent = { userId: 'agent-1', canTriage: true };

  beforeEach(async () => {
    ticketModel = {
      find: jest.fn().mockReturnValue(sortLean([])),
      findOne: jest.fn().mockReturnValue(findOneLean(null)),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getModelToken(Ticket.name), useValue: ticketModel },
      ],
    }).compile();
    service = moduleRef.get(TicketsService);
  });

  it('pins a customer to the tickets they raised', async () => {
    await service.findAll('org-1', false, undefined, undefined, undefined, undefined, customer);
    expect(ticketModel.find).toHaveBeenCalledWith({
      organizationId: 'org-1',
      reporterId: 'client-1',
    });
  });

  it('overrides a spoofed ?reporterId= with the caller\'s own id', async () => {
    await service.findAll('org-1', false, undefined, undefined, 'victim-2', undefined, customer);
    expect(ticketModel.find).toHaveBeenCalledWith({
      organizationId: 'org-1',
      reporterId: 'client-1',
    });
  });

  it('lets a support agent see the whole org queue', async () => {
    await service.findAll('org-1', false, undefined, undefined, undefined, undefined, agent);
    expect(ticketModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('lets a support agent filter by any reporter', async () => {
    await service.findAll('org-1', false, undefined, undefined, 'client-9', undefined, agent);
    expect(ticketModel.find).toHaveBeenCalledWith({
      organizationId: 'org-1',
      reporterId: 'client-9',
    });
  });

  it("404s when a customer opens someone else's ticket", async () => {
    await expect(
      service.findById('t-other', 'org-1', false, customer),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ticketModel.findOne).toHaveBeenCalledWith({
      _id: 't-other',
      organizationId: 'org-1',
      reporterId: 'client-1',
    });
  });

  it('does not scope super admins', async () => {
    await service.findAll('org-1', true, undefined, undefined, undefined, undefined, customer);
    expect(ticketModel.find).toHaveBeenCalledWith({});
  });
});
