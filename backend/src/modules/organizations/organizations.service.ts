import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  private readonly ORG_SELECT = {
    id: true,
    name: true,
    slug: true,
    logoUrl: true,
    address: true,
    phone: true,
    email: true,
    website: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { users: true, projects: true } },
  } as const;

  /** Super Admin only — list every organization on the platform */
  async findAll() {
    return this.prisma.organization.findMany({
      select: this.ORG_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Super Admin only — provision a new tenant org + its admin user */
  async create(dto: CreateOrganizationDto) {
    const existingSlug = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException('An organization with this slug already exists');
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail, deletedAt: null },
    });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the organization
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          email: dto.email,
          address: dto.address,
          phone: dto.phone,
          website: dto.website,
          isActive: true,
        },
        select: this.ORG_SELECT,
      });

      // 2. Find the "Organization Admin" role (global role in db)
      const adminRole = await tx.role.findFirst({
        where: { name: 'Organization Admin' },
      });

      // 3. Create the admin user
      const adminUser = await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.adminEmail,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          status: 'ACTIVE',
        },
      });

      // 4. Assign Organization Admin role
      if (adminRole) {
        await tx.userRole.create({
          data: { userId: adminUser.id, roleId: adminRole.id },
        });
      }

      return { org, adminUser: { id: adminUser.id, email: adminUser.email } };
    });
  }

  /** Super Admin only — suspend or reactivate a tenant */
  async setActive(id: string, isActive: boolean) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: this.ORG_SELECT,
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async update(id: string, requestingOrgId: string, dto: UpdateOrganizationDto, isSuperAdmin = false) {
    // Super Admin can update any org; regular users only their own
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException('You can only update your own organization');
    }

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async getStats(id: string, requestingOrgId: string, isSuperAdmin = false) {
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException('Access denied');
    }

    const [userCount, projectCount, activeProjectCount] = await Promise.all([
      this.prisma.user.count({ where: { organizationId: id, deletedAt: null } }),
      this.prisma.project.count({ where: { organizationId: id } }),
      this.prisma.project.count({ where: { organizationId: id, status: 'ACTIVE' } }),
    ]);

    return {
      totalUsers: userCount,
      totalProjects: projectCount,
      activeProjects: activeProjectCount,
    };
  }
}
