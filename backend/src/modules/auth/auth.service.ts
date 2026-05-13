import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../users/schemas/role.schema';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserStatus } from '../../common/enums';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    // Soft-delete filter applied automatically by softDeletePlugin.
    // Email is lowercased on write by the schema, so we must match that on read.
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase().trim(),
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account has been suspended');
    }

    // Two parallel reads replace Prisma's 5-level nested include. Roles carry
    // their own permissionKeys[] (denormalized from the old role_permissions
    // join), so a single Role.find() yields everything needed for the JWT.
    const [organization, roles] = await Promise.all([
      user.organizationId
        ? this.organizationModel
            .findOne(
              { _id: user.organizationId },
              { _id: 1, name: 1, slug: 1, isActive: 1 },
            )
            .lean()
        : Promise.resolve(null),
      this.roleModel
        .find(
          { _id: { $in: user.roleIds } },
          { _id: 1, name: 1, permissionKeys: 1 },
        )
        .lean(),
    ]);

    if (organization && !organization.isActive) {
      throw new ForbiddenException(
        'Your organization subscription has been suspended. Please contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const permissions = roles.flatMap((r) => r.permissionKeys ?? []);
    const roleNames = roles.map((r) => r.name);
    const isSuperAdmin = permissions.includes('manage:all');

    const tokens = await this.generateTokens(
      user._id,
      user.email,
      user.organizationId ?? '',
      isSuperAdmin,
    );

    await this.userModel.updateOne(
      { _id: user._id },
      {
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
        lastLoginAt: new Date(),
      },
    );

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        organizationId: user.organizationId,
        organization: organization
          ? {
              id: organization._id,
              name: organization.name,
              slug: organization.slug,
              isActive: organization.isActive,
            }
          : null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        userRoles: roles.map((r) => ({ role: { id: r._id, name: r.name } })),
        permissions,
        roles: roleNames,
        isSuperAdmin,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(userId: string, rawRefreshToken: string) {
    const user = await this.userModel.findOne({ _id: userId });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      rawRefreshToken,
      user.refreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(
      user._id,
      user.email,
      user.organizationId ?? '',
      await this.userHasSuperAdminPermission(user.roleIds ?? []),
    );

    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    );

    return tokens;
  }

  async logout(userId: string) {
    await this.userModel.updateOne({ _id: userId }, { refreshToken: null });
  }

  async getMe(userId: string) {
    const user = await this.userModel.findOne({ _id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [organization, roles] = await Promise.all([
      user.organizationId
        ? this.organizationModel
            .findOne(
              { _id: user.organizationId },
              { _id: 1, name: 1, slug: 1, logoUrl: 1, maxUsers: 1 },
            )
            .lean()
        : Promise.resolve(null),
      this.roleModel
        .find(
          { _id: { $in: user.roleIds } },
          { _id: 1, name: 1, permissionKeys: 1 },
        )
        .lean(),
    ]);

    const permissions = roles.flatMap((r) => r.permissionKeys ?? []);
    const roleNames = roles.map((r) => r.name);
    const isSuperAdmin = permissions.includes('manage:all');

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      organization: organization
        ? {
            id: organization._id,
            name: organization.name,
            slug: organization.slug,
            logoUrl: organization.logoUrl,
            maxUsers: organization.maxUsers,
          }
        : null,
      userRoles: roles.map((r) => ({ role: { id: r._id, name: r.name } })),
      permissions,
      roles: roleNames,
      isSuperAdmin,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string | null,
    isSuperAdmin = false,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      organizationId: organizationId ?? '',
      isSuperAdmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async userHasSuperAdminPermission(
    roleIds: string[],
  ): Promise<boolean> {
    if (roleIds.length === 0) return false;
    const role = await this.roleModel.findOne(
      { _id: { $in: roleIds }, permissionKeys: 'manage:all' },
      { _id: 1 },
    );
    return !!role;
  }
}
