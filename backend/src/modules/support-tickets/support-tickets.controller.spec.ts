import 'reflect-metadata';
import { SupportTicketsController } from './support-tickets.controller';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

/**
 * Mirrors `tickets.controller.spec.ts` — this controller is an alias over the
 * same TicketsService and must gate identically. `create` sits on
 * TICKETS.CREATE so a customer can raise a case without holding a triage
 * permission; everything that touches another person's ticket stays on MANAGE.
 */
const perms = (fn: any): string[] => Reflect.getMetadata(PERMISSIONS_KEY, fn);

describe('SupportTicketsController — route permissions', () => {
  it('keeps triage actions behind MANAGE', () => {
    expect(perms(SupportTicketsController.prototype.addComment)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(SupportTicketsController.prototype.update)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
  });

  it('lets a customer raise a ticket without holding a triage permission', () => {
    expect(perms(SupportTicketsController.prototype.create)).toEqual([PERMISSIONS.TICKETS.CREATE]);
  });

  it('keeps reads on READ', () => {
    expect(perms(SupportTicketsController.prototype.findAll)).toEqual([PERMISSIONS.TICKETS.READ]);
    expect(perms(SupportTicketsController.prototype.findOne)).toEqual([PERMISSIONS.TICKETS.READ]);
  });
});
