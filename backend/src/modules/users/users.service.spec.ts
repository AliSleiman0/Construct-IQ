import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Role } from './schemas/role.schema';
import { Organization } from '../organizations/schemas/organization.schema';
import { PasswordPolicyService } from '../auth/services/password-policy.service';

/**
 * #31 — GET /users/:id must be organization-scoped. findByIdScoped filters by
 * organizationId for regular users (so a cross-tenant id 404s instead of
 * leaking the foreign user) and exempts Super Admins. Models are mocked.
 */
describe('UsersService.findByIdScoped (#31)', () => {
  let service: UsersService;
  let userModel: any;
  let roleModel: any;

  const leanOnce = (result: any) => ({ lean: () => Promise.resolve(result) });
  const fakeUser = (over: any = {}) => ({
    _id: 'u-1',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    phone: null,
    avatarUrl: null,
    status: 'ACTIVE',
    organizationId: 'org-1',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    roleIds: [],
    ...over,
  });

  beforeEach(async () => {
    userModel = { findOne: jest.fn() };
    roleModel = { find: jest.fn().mockReturnValue(leanOnce([])) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Role.name), useValue: roleModel },
        { provide: getModelToken(Organization.name), useValue: {} },
        { provide: getConnectionToken(), useValue: {} },
        { provide: PasswordPolicyService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('scopes the lookup by organizationId for a regular user', async () => {
    userModel.findOne.mockReturnValue(leanOnce(fakeUser()));
    const res = await service.findByIdScoped('u-1', 'org-1', false);
    expect(userModel.findOne).toHaveBeenCalledWith({ _id: 'u-1', organizationId: 'org-1' });
    expect(res.id).toBe('u-1');
  });

  it('404s a cross-tenant id (filter excludes the foreign record)', async () => {
    // Mongo returns null because the {_id, organizationId} pair does not match.
    userModel.findOne.mockReturnValue(leanOnce(null));
    await expect(service.findByIdScoped('u-other', 'org-1', false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(userModel.findOne).toHaveBeenCalledWith({ _id: 'u-other', organizationId: 'org-1' });
  });

  it('does NOT scope by org for a Super Admin', async () => {
    userModel.findOne.mockReturnValue(leanOnce(fakeUser({ organizationId: 'org-2' })));
    const res = await service.findByIdScoped('u-1', 'org-1', true);
    expect(userModel.findOne).toHaveBeenCalledWith({ _id: 'u-1' });
    expect(res.id).toBe('u-1');
  });
});
