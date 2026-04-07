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

// All roles provisioned for every new organization, with their permission sets.
// Permissions are global (no org scope) so we look them up by name at creation time.
const STANDARD_ROLES: Array<{ name: string; description: string; permissions: string[] }> = [
  {
    name: 'Admin',
    description: 'Full control within own organization',
    permissions: ['manage:company'],
  },
  {
    name: 'Project Manager',
    description: 'Manages assigned projects, team, tasks, and approves POs',
    permissions: [
      'read:organizations',
      'read:users', 'read:roles',
      'manage:projects', 'assign:project_members',
      'manage:phases', 'manage:milestones',
      'manage:tasks', 'assign:tasks',
      'manage:reports',
      'manage:issues', 'assign:issues',
      'read:budget', 'update:projects',
      'read:suppliers',
      'read:purchase_orders', 'approve:purchase_orders',
      'read:deliveries',
      'manage:documents',
      'read:ai', 'use:ai',
    ],
  },
  {
    name: 'Site Engineer',
    description: 'Submits daily reports, creates issues, updates assigned tasks',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks', 'update:tasks',
      'create:reports', 'read:reports', 'update:reports',
      'create:issues', 'read:issues', 'update:issues',
      'read:phases', 'read:milestones',
      'read:documents', 'upload:documents',
      'read:ai',
    ],
  },
  {
    name: 'Planning Engineer',
    description: 'Manages phases, milestones, and project schedule',
    permissions: [
      'read:projects',
      'read:users',
      'manage:phases', 'manage:milestones',
      'manage:tasks', 'assign:tasks',
      'read:reports',
      'read:issues',
      'read:budget',
      'read:documents',
      'read:ai',
    ],
  },
  {
    name: 'Quantity Surveyor',
    description: 'Owns budget management and cost tracking',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'read:phases', 'read:milestones',
      'read:reports',
      'read:issues',
      'manage:budget',
      'read:purchase_orders',
      'read:deliveries',
      'read:suppliers',
      'read:documents',
      'read:ai',
    ],
  },
  {
    name: 'Procurement Officer',
    description: 'Manages suppliers, purchase orders, and deliveries',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'read:budget',
      'manage:suppliers',
      'manage:purchase_orders',
      'manage:deliveries', 'update:deliveries',
      'read:documents', 'upload:documents',
      'read:ai',
    ],
  },
  {
    name: 'Finance / Management Viewer',
    description: 'Read-only visibility across projects, budget, and procurement',
    permissions: [
      'read:projects',
      'read:tasks',
      'read:phases', 'read:milestones',
      'read:reports',
      'read:issues',
      'read:budget',
      'read:suppliers',
      'read:purchase_orders',
      'read:deliveries',
      'read:documents',
      'read:ai',
    ],
  },
  {
    name: 'Client Viewer',
    description: 'External client — limited read access to assigned project overview',
    permissions: [
      'read:projects',
      'read:milestones',
      'read:issues',
      'read:reports',
      'read:documents',
    ],
  },
  {
    name: 'Supplier User',
    description: 'External supplier — view own POs and update delivery status',
    permissions: [
      'read:purchase_orders',
      'update:deliveries',
    ],
  },
];

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
    maxUsers: true,
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

  /** Return a single org — non-Super-Admins can only see their own. */
  async findById(id: string, requestingOrgId: string, isSuperAdmin = false) {
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException('Access denied');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: this.ORG_SELECT,
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
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

    // Fetch all global permissions once (outside the transaction for efficiency)
    const allPermissions = await this.prisma.permission.findMany({
      select: { id: true, name: true },
    });
    const permMap = new Map(allPermissions.map((p) => [p.name, p.id]));

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
          maxUsers: dto.maxUsers ?? null,
          isActive: true,
        },
        select: this.ORG_SELECT,
      });

      // 2. Provision all standard roles for this new organization
      //    Each role is created with its full permission set so the org is
      //    immediately usable without needing a separate seed run.
      let adminRoleId: string | null = null;
      for (const roleDef of STANDARD_ROLES) {
        const role = await tx.role.create({
          data: {
            organizationId: org.id,
            name: roleDef.name,
            description: roleDef.description,
            isSystem: true,
          },
        });

        if (roleDef.name === 'Admin') {
          adminRoleId = role.id;
        }

        // Attach permissions (skip any that don't exist in the global table)
        const permissionData = roleDef.permissions
          .map((name) => permMap.get(name))
          .filter((id): id is string => id !== undefined)
          .map((permissionId) => ({ roleId: role.id, permissionId }));

        if (permissionData.length > 0) {
          await tx.rolePermission.createMany({ data: permissionData });
        }
      }

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

      // 4. Assign the Admin role (created above for this org)
      if (adminRoleId) {
        await tx.userRole.create({
          data: { userId: adminUser.id, roleId: adminRoleId },
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
