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
import { createHmac, timingSafeEqual } from 'crypto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../users/schemas/role.schema';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserStatus } from '../../common/enums';
import { OrgSettingsService } from '../org-settings/org-settings.service';

const DEFAULT_LOCKOUT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_DURATION_MIN = 15;

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
    private orgSettingsService: OrgSettingsService,
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

    // Lockout check: if locked and the window hasn't expired, refuse before
    // even attempting the bcrypt compare. Message intentionally vague — we
    // don't leak whether the supplied password was correct.
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const unlockAt = user.lockedUntil.toISOString().slice(11, 19); // HH:MM:SS
      throw new UnauthorizedException(
        `Account temporarily locked. Try again at ${unlockAt} UTC.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.recordFailedLogin(user._id, user.organizationId);
      throw new UnauthorizedException('Invalid email or password');
    }

    const permissions = roles.flatMap((r) => r.permissionKeys ?? []);
    const roleNames = roles.map((r) => r.name);
    const isSuperAdmin = permissions.includes('manage:all');

    // Per-org access-token TTL. Super Admins / org-less users fall back to
    // the env default inside generateTokens().
    const accessTtl = await this.resolveAccessTtl(user.organizationId);
    const tokens = await this.generateTokens(
      user._id,
      user.email,
      user.organizationId ?? '',
      isSuperAdmin,
      accessTtl,
    );

    // Reset lockout counters on first successful login. Cheap idempotent set.
    await this.userModel.updateOne(
      { _id: user._id },
      {
        refreshToken: this.hmacRefresh(tokens.refreshToken),
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
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

    if (!this.refreshTokenMatches(rawRefreshToken, user.refreshToken)) {
      throw new ForbiddenException('Access denied');
    }

    const accessTtl = await this.resolveAccessTtl(user.organizationId);
    const tokens = await this.generateTokens(
      user._id,
      user.email,
      user.organizationId ?? '',
      await this.userHasSuperAdminPermission(user.roleIds ?? []),
      accessTtl,
    );

    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: this.hmacRefresh(tokens.refreshToken) },
    );

    return tokens;
  }

  /** Atomically bump failed-login counter and lock when the org's threshold
   *  is reached. Uses $inc so concurrent failures don't race. */
  private async recordFailedLogin(
    userId: string,
    organizationId: string | null,
  ): Promise<void> {
    const { maxAttempts, durationMin } = await this.resolveLockoutPolicy(
      organizationId,
    );

    // Atomic increment + read the resulting value.
    const updated = await this.userModel.findOneAndUpdate(
      { _id: userId },
      { $inc: { failedLoginAttempts: 1 } },
      { new: true, projection: { failedLoginAttempts: 1 } },
    );

    if (!updated) return;

    if (updated.failedLoginAttempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + durationMin * 60_000);
      await this.userModel.updateOne(
        { _id: userId },
        { lockedUntil, failedLoginAttempts: 0 },
      );
    }
  }

  private async resolveLockoutPolicy(organizationId: string | null) {
    if (!organizationId) {
      return {
        maxAttempts: DEFAULT_LOCKOUT_MAX_ATTEMPTS,
        durationMin: DEFAULT_LOCKOUT_DURATION_MIN,
      };
    }
    const settings = await this.orgSettingsService.get(organizationId);
    return {
      maxAttempts:
        settings?.lockoutMaxAttempts ?? DEFAULT_LOCKOUT_MAX_ATTEMPTS,
      durationMin:
        settings?.lockoutDurationMin ?? DEFAULT_LOCKOUT_DURATION_MIN,
    };
  }

  /** Resolve the per-org access-token TTL. Returns a value compatible with
   *  jsonwebtoken's `expiresIn` (e.g. `"15m"`). Super Admin / org-less users
   *  get the env default. */
  private async resolveAccessTtl(
    organizationId: string | null,
  ): Promise<string | undefined> {
    if (!organizationId) return undefined;
    const settings = await this.orgSettingsService.get(organizationId);
    const min = settings?.sessionTimeoutMin;
    if (typeof min !== 'number' || min <= 0) return undefined;
    return `${min}m`;
  }

  private hmacRefresh(raw: string): string {
    const secret = this.configService.get<string>('jwt.refreshSecret');
    if (!secret) {
      throw new Error('jwt.refreshSecret is not configured');
    }
    return createHmac('sha256', secret).update(raw).digest('base64url');
  }

  private refreshTokenMatches(raw: string, stored: string): boolean {
    const candidate = this.hmacRefresh(raw);
    if (candidate.length !== stored.length) return false;
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(stored));
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
    accessExpiresInOverride?: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      organizationId: organizationId ?? '',
      isSuperAdmin,
    };

    const accessExpiresIn =
      accessExpiresInOverride ??
      this.configService.get<string>('jwt.accessExpiresIn');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
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
