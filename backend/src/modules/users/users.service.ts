import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from '../../common/enums';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  organizationId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{ role: { id: string; name: string } }>;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  /** Shape a user doc to the API response format the frontend expects.
   *  Roles must be passed in (already loaded) — keeps this pure & testable. */
  private toUserResponse(
    user: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      avatarUrl: string | null;
      status: UserStatus;
      organizationId: string | null;
      lastLoginAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    roles: Array<{ _id: string; name: string }>,
  ): UserResponse {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      organizationId: user.organizationId,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userRoles: roles.map((r) => ({ role: { id: r._id, name: r.name } })),
    };
  }

  private async loadRolesForUser(roleIds: string[]) {
    if (roleIds.length === 0) return [];
    return this.roleModel
      .find({ _id: { $in: roleIds } }, { _id: 1, name: 1 })
      .lean();
  }

  async findById(id: string): Promise<UserResponse> {
    const user = await this.userModel.findOne({ _id: id }).lean();
    if (!user) throw new NotFoundException('User not found');
    const roles = await this.loadRolesForUser(user.roleIds ?? []);
    return this.toUserResponse(user as any, roles as any);
  }

  /** Returns the raw user doc — used by auth flows that need passwordHash etc. */
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .lean<User | null>()
      .exec();
  }

  async findAllByOrganization(organizationId: string): Promise<UserResponse[]> {
    const users = await this.userModel
      .find({ organizationId })
      .sort({ createdAt: 1 })
      .lean();

    const allRoleIds = Array.from(new Set(users.flatMap((u) => u.roleIds ?? [])));
    const roleDocs = await this.roleModel
      .find({ _id: { $in: allRoleIds } }, { _id: 1, name: 1 })
      .lean();
    const roleById = new Map(roleDocs.map((r) => [r._id, r]));

    return users.map((u) =>
      this.toUserResponse(
        u as any,
        (u.roleIds ?? [])
          .map((rid) => roleById.get(rid))
          .filter((r): r is NonNullable<typeof r> => !!r),
      ),
    );
  }

  /** Super Admin only — list every user across every org */
  async findAllGlobal(): Promise<UserResponse[]> {
    const users = await this.userModel.find().sort({ createdAt: 1 }).lean();

    const allRoleIds = Array.from(new Set(users.flatMap((u) => u.roleIds ?? [])));
    const roleDocs = await this.roleModel
      .find({ _id: { $in: allRoleIds } }, { _id: 1, name: 1 })
      .lean();
    const roleById = new Map(roleDocs.map((r) => [r._id, r]));

    return users.map((u) =>
      this.toUserResponse(
        u as any,
        (u.roleIds ?? [])
          .map((rid) => roleById.get(rid))
          .filter((r): r is NonNullable<typeof r> => !!r),
      ),
    );
  }

  async create(
    organizationId: string,
    dto: CreateUserDto,
  ): Promise<UserResponse> {
    const existing = await this.userModel.findOne({
      email: dto.email.toLowerCase().trim(),
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Per-organization user cap. `null` = unlimited.
    const org = await this.organizationModel
      .findOne({ _id: organizationId }, { maxUsers: 1 })
      .lean();
    if (org?.maxUsers != null) {
      const currentCount = await this.userModel.countDocuments({
        organizationId,
      });
      if (currentCount >= org.maxUsers) {
        throw new ForbiddenException(
          `This organization has reached its user limit of ${org.maxUsers}`,
        );
      }
    }

    const role = await this.roleModel.findOne({ _id: dto.roleId }).lean();
    if (!role) throw new NotFoundException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // create + role-attach in a single transaction (replica set required)
    const session = await this.connection.startSession();
    try {
      let createdId: string | null = null;
      await session.withTransaction(async () => {
        const [created] = await this.userModel.create(
          [
            {
              organizationId,
              email: dto.email,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone ?? null,
              status: dto.status ?? UserStatus.ACTIVE,
              roleIds: [dto.roleId],
            },
          ],
          { session },
        );
        createdId = created._id;
      });

      if (!createdId) {
        // unreachable in practice — withTransaction throws on abort
        throw new Error('Failed to create user');
      }

      return this.findById(createdId);
    } finally {
      await session.endSession();
    }
  }

  /** Super Admin: list every user whose role grants `manage:company` —
   *  i.e. every Org Admin across every tenant. Used by the SA's Org Admins
   *  page so it isn't scoped to the SA's home org. */
  async findAllOrgAdmins(): Promise<UserResponse[]> {
    const adminRoleIds = await this.roleModel
      .find({ permissionKeys: 'manage:company' }, { _id: 1 })
      .lean();
    if (adminRoleIds.length === 0) return [];

    const idSet = adminRoleIds.map((r) => r._id);
    const users = await this.userModel
      .find({ roleIds: { $in: idSet } })
      .sort({ createdAt: 1 })
      .lean();

    const allRoleIds = Array.from(new Set(users.flatMap((u) => u.roleIds ?? [])));
    const roleDocs = await this.roleModel
      .find({ _id: { $in: allRoleIds } }, { _id: 1, name: 1 })
      .lean();
    const roleById = new Map(roleDocs.map((r) => [r._id, r]));

    return users.map((u) =>
      this.toUserResponse(
        u as any,
        (u.roleIds ?? [])
          .map((rid) => roleById.get(rid))
          .filter((r): r is NonNullable<typeof r> => !!r),
      ),
    );
  }

  /** Super Admin: create an Org Admin user in any organization. Resolves
   *  the target org's admin role server-side so the caller doesn't need
   *  to know per-org role IDs.
   *
   *  We look up by the `manage:company` permission rather than by name:
   *  legacy seeded orgs use `ORG_ADMIN`, orgs created via POST /organizations
   *  use `Admin`. If neither exists (orgs inserted directly without their
   *  STANDARD_ROLES — happens with the demo seed for Company B/C), provision
   *  the `Admin` role on the fly. */
  async createOrgAdmin(dto: CreateOrgAdminDto): Promise<UserResponse> {
    const org = await this.organizationModel
      .findOne({ _id: dto.organizationId }, { _id: 1 })
      .lean();
    if (!org) throw new NotFoundException('Organization not found');

    let role = await this.roleModel
      .findOne({
        organizationId: dto.organizationId,
        permissionKeys: 'manage:company',
      })
      .lean();

    if (!role) {
      const created = await this.roleModel.create({
        organizationId: dto.organizationId,
        name: 'Admin',
        description: 'Full control within own organization',
        isSystem: true,
        permissionKeys: ['manage:company'],
      });
      role = created.toObject() as any;
    }

    return this.create(dto.organizationId, {
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      roleId: role!._id,
    } as CreateUserDto);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.userModel.findOne({ _id: id, organizationId });
    if (!user) throw new NotFoundException('User not found');

    await this.userModel.updateOne({ _id: id }, dto);
    return this.findById(id);
  }

  async softDelete(id: string, organizationId: string) {
    const user = await this.userModel.findOne({ _id: id, organizationId });
    if (!user) throw new NotFoundException('User not found');

    await this.userModel.updateOne({ _id: id }, { deletedAt: new Date() });

    return { message: 'User deactivated successfully' };
  }

  async assignRole(userId: string, organizationId: string, roleId: string) {
    const user = await this.userModel.findOne({ _id: userId, organizationId });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.roleModel.findOne({ _id: roleId }).lean();
    if (!role) throw new NotFoundException('Role not found');

    if (user.roleIds.includes(roleId)) {
      throw new ConflictException('Role already assigned to this user');
    }

    await this.userModel.updateOne(
      { _id: userId },
      { $addToSet: { roleIds: roleId } },
    );

    return { role: { id: role._id, name: role.name } };
  }

  async removeRole(userId: string, organizationId: string, roleId: string) {
    const user = await this.userModel.findOne({ _id: userId, organizationId });
    if (!user) throw new NotFoundException('User not found');

    if (!user.roleIds.includes(roleId)) {
      throw new NotFoundException('Role not assigned to this user');
    }

    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { roleIds: roleId } },
    );

    return { message: 'Role removed successfully' };
  }

  /** List roles scoped to the user's organization (Super Admin sees all). */
  async findAllRoles(organizationId: string, isSuperAdmin = false) {
    const filter = isSuperAdmin ? {} : { organizationId };
    const roles = await this.roleModel
      .find(filter, { _id: 1, name: 1, description: 1 })
      .sort({ name: 1 })
      .lean();
    return roles.map((r) => ({
      id: r._id,
      name: r.name,
      description: r.description,
    }));
  }
}
