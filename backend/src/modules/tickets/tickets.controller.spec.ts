import 'reflect-metadata';
import { TicketsController } from './tickets.controller';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';

/**
 * Permission-metadata guard test, originally issue #32: a read-only user must
 * not be able to triage tickets. Reads stay on TICKETS.READ.
 *
 * Refined when the client portal shipped. Raising a ticket and replying on
 * your own thread are things a *customer* does, so they can no longer sit
 * behind `manage:tickets` — no customer should hold a triage permission:
 *
 *   - `create` moved to TICKETS.CREATE. `manage:tickets` still satisfies it
 *     through the permission hierarchy, so staff are unaffected.
 *   - `addComment` moved to TICKETS.READ, because authorization for it is
 *     *ownership*, not permission level: the handler resolves the ticket
 *     through the caller's own viewer scope first, so a non-triager posting to
 *     someone else's ticket 404s. See `TicketViewer`.
 *
 * Everything that acts on another person's ticket stays on MANAGE.
 */
const perms = (fn: any): string[] => Reflect.getMetadata(PERMISSIONS_KEY, fn);

describe('TicketsController — route permissions', () => {
  it('keeps triage actions behind MANAGE', () => {
    expect(perms(TicketsController.prototype.update)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(TicketsController.prototype.assign)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
    expect(perms(TicketsController.prototype.remove)).toEqual([PERMISSIONS.TICKETS.MANAGE]);
  });

  it('lets a customer raise a ticket without holding a triage permission', () => {
    expect(perms(TicketsController.prototype.create)).toEqual([PERMISSIONS.TICKETS.CREATE]);
  });

  it('lets a reporter reply on their own thread (ownership enforced in the handler)', () => {
    expect(perms(TicketsController.prototype.addComment)).toEqual([PERMISSIONS.TICKETS.READ]);
  });

  it('keeps reads on READ', () => {
    expect(perms(TicketsController.prototype.findAll)).toEqual([PERMISSIONS.TICKETS.READ]);
    expect(perms(TicketsController.prototype.findOne)).toEqual([PERMISSIONS.TICKETS.READ]);
  });
});
