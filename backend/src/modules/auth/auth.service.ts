import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Your account has been suspended');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.organizationId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
        lastLoginAt: new Date(),
      },
    });

    const permissions = user.userRoles.flatMap(
      (ur: { role: { rolePermissions: { permission: { name: string } }[] } }) =>
        ur.role.rolePermissions.map((rp: { permission: { name: string } }) => rp.permission.name),
    );

    const { passwordHash, refreshToken, ...safeUser } = user;

    return {
      user: { ...safeUser, permissions },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(userId: string, rawRefreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

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

    const tokens = await this.generateTokens(user.id, user.email, user.organizationId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                rolePermissions: {
                  include: { permission: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = user.userRoles.flatMap(
      (ur: { role: { rolePermissions: { permission: { name: string } }[] } }) =>
        ur.role.rolePermissions.map((rp: { permission: { name: string } }) => rp.permission.name),
    );

    const roles = user.userRoles.map(
      (ur: { role: { name: string } }) => ur.role.name,
    );

    return { ...user, permissions, roles };
  }

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
  ) {
    const payload: JwtPayload = { sub: userId, email, organizationId };

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
}
