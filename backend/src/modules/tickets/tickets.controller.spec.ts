import 'reflect-metadata';
import { TicketsController } from './tickets.controller';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

/**
 * Permission-metadata guard test for issue #32: the mutating ticket endpoints
 * (create, add-comment) must require TICKETS.MANAGE, not TICKETS.READ — a
 * read-only user must not be able to create tickets or post comments. Reads
 * stay on TICKETS.READ. Asserted via route metadata so no Nest bootstrap is
 * needed; this also locks the convention against silent regressions.
 */
const perms = (fn: any): string[] => Reflect.getMetadata(PERMISSIONS_KEY, fn);

describe('TicketsController — route permissions (#32)', () => {
  it('gates mutations behind MANAGE', () => {
    expect(perms(TicketsController.prototype.create)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(TicketsController.prototype.addComment)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(TicketsController.prototype.update)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(TicketsController.prototype.assign)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(TicketsController.prototype.remove)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
  });

  it('keeps reads on READ', () => {
    expect(perms(TicketsController.prototype.findAll)).toEqual([PERMISSIONS.TICKETS.READ]);
    expect(perms(TicketsController.prototype.findOne)).toEqual([PERMISSIONS.TICKETS.READ]);
  });
});
