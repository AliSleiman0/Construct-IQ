import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  organizationId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    select: {
      role: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async findAllByOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Super Admin only — list every user across all organizations */
  async findAllGlobal() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Enforce per-organization user cap
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { maxUsers: true },
    });
    if (org?.maxUsers !== null && org?.maxUsers !== undefined) {
      const currentCount = await this.prisma.user.count({
        where: { organizationId, deletedAt: null },
      });
      if (currentCount >= org.maxUsers) {
        throw new ForbiddenException(
          `This organization has reached its user limit of ${org.maxUsers}`,
        );
      }
    }

    // Validate the role exists
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user + assign role in one transaction
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: dto.status,
        },
        select: USER_SELECT,
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: dto.roleId },
      });

      // Return fresh record with roles populated
      return tx.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
    });
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async softDelete(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'User deactivated successfully' };
  }

  async assignRole(userId: string, organizationId: string, roleId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (existing) throw new ConflictException('Role already assigned to this user');

    return this.prisma.userRole.create({
      data: { userId, roleId },
      select: { role: { select: { id: true, name: true } } },
    });
  }

  async removeRole(userId: string, organizationId: string, roleId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (!existing) throw new NotFoundException('Role not assigned to this user');

    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    return { message: 'Role removed successfully' };
  }

  /** List roles scoped to the user's organization (Super Admin sees all). */
  async findAllRoles(organizationId: string, isSuperAdmin = false) {
    return this.prisma.role.findMany({
      where: isSuperAdmin ? undefined : { organizationId },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }
}

