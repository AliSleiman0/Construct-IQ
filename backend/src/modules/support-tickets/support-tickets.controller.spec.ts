import 'reflect-metadata';
import { SupportTicketsController } from './support-tickets.controller';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

/**
 * Permission-metadata guard test for issue #32: the mutating support-ticket
 * endpoints (create, add-comment) must require TICKETS.MANAGE, not TICKETS.READ.
 * Reads stay on TICKETS.READ. Asserted via route metadata so no Nest bootstrap
 * is needed; locks the convention against silent regressions.
 */
const perms = (fn: any): string[] => Reflect.getMetadata(PERMISSIONS_KEY, fn);

describe('SupportTicketsController — route permissions (#32)', () => {
  it('gates mutations behind MANAGE', () => {
    expect(perms(SupportTicketsController.prototype.create)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(SupportTicketsController.prototype.addComment)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(SupportTicketsController.prototype.update)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
  });

  it('keeps reads on READ', () => {
    expect(perms(SupportTicketsController.prototype.findAll)).toEqual([PERMISSIONS.TICKETS.READ]);
    expect(perms(SupportTicketsController.prototype.findOne)).toEqual([PERMISSIONS.TICKETS.READ]);
  });
});
