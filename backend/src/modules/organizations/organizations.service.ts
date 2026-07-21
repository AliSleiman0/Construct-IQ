import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../users/schemas/role.schema';
import {
  Permission,
  PermissionDocument,
} from '../users/schemas/permission.schema';
import {
  Project,
  ProjectDocument,
} from '../projects/schemas/project.schema';
import { AiPlan, AiPlanDocument } from '../ai-plans/schemas/ai-plan.schema';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ProjectStatus, UserStatus } from '../../common/enums';
import { AuditService } from '../audit/audit.service';
import { cascadeSoftDelete } from '../../database/mongoose/cascade.util';

// All roles provisioned for every new organization, with their permission sets.
// Permissions are global (no org scope) so we look them up by name at creation time.
//
// `name` MUST be the canonical role CODE (matching backend/scripts/seed.ts and
// frontend/src/config/roles.ts) — login returns `roles: Role.name[]` and the
// frontend resolves the landing route / sidebar from those codes. Human-readable
// labels live in `description` (and frontend ROLE_LABELS). The trailing three
// roles (PLANNING_ENG / FINANCE_VIEWER / SUPPLIER) have no frontend section yet;
// they remain available for assignment but route to the default fallback.
//
// `use:ai` is granted to every internal staff role that has a UI of its own —
// the assistant then scopes itself to whatever else that role can read (see
// modules/ai/capabilities). ORG_ADMIN needs no explicit grant: `manage:company`
// is a wildcard. External roles (CLIENT / SUPPLIER / SUBCONTRACTOR) deliberately
// get no AI access. PLANNING_ENG / FINANCE_VIEWER are withheld for a different
// reason: they have no route prefix in frontend/src/config/roles.ts, so
// `roleFromUser()` returns null and (app)/layout.tsx logs them straight back
// out — an assistant would have nowhere to navigate. Grant `use:ai` to them at
// the same time those sections ship.
export const STANDARD_ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: 'ORG_ADMIN',
    description: 'Full control within own organization',
    permissions: ['manage:company'],
  },
  {
    name: 'PM',
    description: 'Manages assigned projects, team, tasks, and approves POs',
    permissions: [
      'read:organizations',
      'read:users',
      'read:roles',
      'manage:projects',
      'assign:project_members',
      'manage:phases',
      'manage:milestones',
      'manage:tasks',
      'assign:tasks',
      'manage:reports',
      'manage:issues',
      'assign:issues',
      'manage:inspections',
      'manage:rfis',
      'read:budget',
      'update:projects',
      'read:suppliers',
      'read:purchase_orders',
      'approve:purchase_orders',
      'reject:purchase_orders',
      'read:material_requests',
      'create:material_requests',
      'read:deliveries',
      'manage:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
      'manage:bids',
    ],
  },
  {
    name: 'SITE_ENG',
    description:
      'Submits daily reports, creates issues, updates assigned tasks',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'update:tasks',
      'create:reports',
      'read:reports',
      'update:reports',
      'create:issues',
      'read:issues',
      'update:issues',
      'create:inspections',
      'read:inspections',
      'update:inspections',
      'create:rfis',
      'read:rfis',
      'update:rfis',
      'read:phases',
      'read:milestones',
      'read:deliveries',
      'confirm:deliveries',
      'read:documents',
      'upload:documents',
      'read:ai',
      'use:ai',
      'read:dashboard',
    ],
  },
  {
    name: 'PLANNING_ENG',
    description: 'Manages phases, milestones, and project schedule',
    permissions: [
      'read:projects',
      'read:users',
      'manage:phases',
      'manage:milestones',
      'manage:tasks',
      'assign:tasks',
      'read:reports',
      'read:issues',
      'read:budget',
      'read:documents',
      'read:ai',
    ],
  },
  {
    name: 'SURVEYOR',
    description: 'Owns budget management and cost tracking',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'read:phases',
      'read:milestones',
      'read:reports',
      'read:issues',
      'manage:budget',
      'read:purchase_orders',
      'read:deliveries',
      'read:suppliers',
      'read:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
    ],
  },
  {
    name: 'PROCUREMENT',
    description: 'Manages suppliers, purchase orders, and deliveries',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'read:budget',
      'manage:suppliers',
      'manage:purchase_orders',
      'manage:material_requests',
      'manage:deliveries',
      'update:deliveries',
      'read:documents',
      'upload:documents',
      'read:ai',
      'use:ai',
      'manage:bids',
    ],
  },
  {
    name: 'FINANCE_VIEWER',
    description:
      'Read-only visibility across projects, budget, and procurement',
    permissions: [
      'read:projects',
      'read:tasks',
      'read:phases',
      'read:milestones',
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
    name: 'CLIENT',
    description:
      'External client — limited read access to assigned project overview',
    permissions: [
      'read:projects',
      'read:milestones',
      'read:issues',
      'read:reports',
      'read:documents',
    ],
  },
  {
    name: 'SUPPLIER',
    description: 'External supplier — view own POs and update delivery status',
    permissions: ['read:purchase_orders', 'update:deliveries'],
  },
];

export interface OrgResponse {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  logoUrl: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  maxUsers: number | null;
  planId: string | null;
  aiPlanId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { users: number; projects: number };
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(AiPlan.name) private aiPlanModel: Model<AiPlanDocument>,
    @InjectConnection() private connection: Connection,
    private readonly auditService: AuditService,
  ) {}

  /** Fire-and-forget audit write — a logging failure must never break the op. */
  private audit(entry: Parameters<AuditService['log']>[0]): void {
    this.auditService.log(entry).catch(() => undefined);
  }

  private async withCounts(
    org: OrganizationDocument | (Organization & { _id: string }),
  ): Promise<OrgResponse> {
    const [userCount, projectCount] = await Promise.all([
      this.userModel.countDocuments({ organizationId: org._id }),
      this.projectModel.countDocuments({ organizationId: org._id }),
    ]);
    return {
      id: org._id,
      name: org.name,
      slug: org.slug,
      shortName: org.shortName,
      industry: org.industry,
      size: org.size,
      description: org.description,
      logoUrl: org.logoUrl,
      street: org.street,
      city: org.city,
      state: org.state,
      zip: org.zip,
      country: org.country,
      phone: org.phone,
      email: org.email,
      website: org.website,
      maxUsers: org.maxUsers,
      planId: org.planId,
      aiPlanId: (org as any).aiPlanId ?? null,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      _count: { users: userCount, projects: projectCount },
    };
  }

  /** Super Admin only — list every organization on the platform */
  async findAll(): Promise<OrgResponse[]> {
    const orgs = await this.organizationModel
      .find()
      .sort({ createdAt: -1 })
      .lean();
    return Promise.all(orgs.map((o) => this.withCounts(o as any)));
  }

  async findById(
    id: string,
    requestingOrgId: string,
    isSuperAdmin = false,
  ): Promise<OrgResponse> {
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException('Access denied');
    }

    const org = await this.organizationModel.findOne({ _id: id }).lean();
    if (!org) throw new NotFoundException('Organization not found');
    return this.withCounts(org as any);
  }

  /** Super Admin only — provision a new tenant org + its admin user atomically */
  async create(dto: CreateOrganizationDto) {
    const existingSlug = await this.organizationModel.findOne({
      slug: dto.slug,
    });
    if (existingSlug) {
      throw new ConflictException(
        'An organization with this slug already exists',
      );
    }

    const existingEmail = await this.userModel.findOne({
      email: dto.adminEmail.toLowerCase().trim(),
    });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    // Cache the (immutable) global permission name → exists check upfront
    const allPermissions = await this.permissionModel
      .find({}, { name: 1 })
      .lean();
    const knownPermissionNames = new Set(allPermissions.map((p) => p.name));

    const session = await this.connection.startSession();
    try {
      let result: { org: OrgResponse; adminUser: { id: string; email: string } } | null = null;

      await session.withTransaction(async () => {
        // 1. Create the organization
        const [org] = await this.organizationModel.create(
          [
            {
              name: dto.name,
              slug: dto.slug,
              email: dto.email ?? null,
              phone: dto.phone ?? null,
              website: dto.website ?? null,
              maxUsers: dto.maxUsers ?? null,
              isActive: true,
            },
          ],
          { session },
        );

        // 2. Provision all standard roles. Each role embeds its permission
        //    keys directly (replacing the old RolePermission join), with
        //    unknown permissions filtered out for safety.
        const roleDocs = STANDARD_ROLES.map((roleDef) => ({
          organizationId: org._id,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          permissionKeys: roleDef.permissions.filter((p) =>
            knownPermissionNames.has(p),
          ),
        }));

        const createdRoles = await this.roleModel.insertMany(roleDocs, {
          session,
        });
        const adminRole = createdRoles.find((r) => r.name === 'ORG_ADMIN');

        // 3. Create the admin user with the Admin role attached
        const [adminUser] = await this.userModel.create(
          [
            {
              organizationId: org._id,
              email: dto.adminEmail,
              passwordHash,
              firstName: dto.adminFirstName,
              lastName: dto.adminLastName,
              status: UserStatus.ACTIVE,
              roleIds: adminRole ? [adminRole._id] : [],
            },
          ],
          { session },
        );

        result = {
          org: {
            id: org._id,
            name: org.name,
            slug: org.slug,
            shortName: org.shortName,
            industry: org.industry,
            size: org.size,
            description: org.description,
            logoUrl: org.logoUrl,
            street: org.street,
            city: org.city,
            state: org.state,
            zip: org.zip,
            country: org.country,
            phone: org.phone,
            email: org.email,
            website: org.website,
            maxUsers: org.maxUsers,
            planId: org.planId,
            aiPlanId: (org as any).aiPlanId ?? null,
            isActive: org.isActive,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
            _count: { users: 1, projects: 0 },
          },
          adminUser: { id: adminUser._id, email: adminUser.email },
        };
      });

      if (!result) {
        throw new Error('Failed to create organization');
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  /** Super Admin only — suspend or reactivate a tenant */
  async setActive(id: string, isActive: boolean) {
    const org = await this.organizationModel.findOne({ _id: id });
    if (!org) throw new NotFoundException('Organization not found');

    org.isActive = isActive;
    await org.save();

    return { id: org._id, name: org.name, isActive: org.isActive };
  }

  /**
   * Super Admin only — delete a tenant. Soft-deletes the organization and
   * cascade soft-deletes every org-scoped, soft-deletable entity in one sweep.
   * Collections without the soft-delete plugin (e.g. audit_logs) are preserved.
   */
  async softDelete(id: string, actorUserId?: string) {
    const org = await this.organizationModel.findOne({ _id: id });
    if (!org) throw new NotFoundException('Organization not found');

    const now = new Date();
    await this.organizationModel.updateOne({ _id: id }, { deletedAt: now });
    const cascade = await cascadeSoftDelete(this.connection, 'organizationId', id, now);

    this.audit({
      organizationId: id,
      actorUserId,
      action: 'DELETE',
      entityType: 'ORGANIZATION',
      entityId: id,
      metadata: { cascade },
    });

    return { message: 'Organization deleted successfully' };
  }

  async update(
    id: string,
    requestingOrgId: string,
    dto: UpdateOrganizationDto,
    isSuperAdmin = false,
  ) {
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException('You can only update your own organization');
    }

    const org = await this.organizationModel.findOne({ _id: id });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.slug && dto.slug !== org.slug) {
      const clash = await this.organizationModel
        .findOne({ slug: dto.slug, _id: { $ne: id } }, { _id: 1 })
        .lean();
      if (clash) throw new ConflictException('Slug already in use');
    }

    Object.assign(org, dto);
    await org.save();

    return this.withCounts(org);
  }

  /** Set the logoUrl on an organization. Same access rules as update(). */
  async setLogo(
    id: string,
    requestingOrgId: string,
    logoUrl: string,
    isSuperAdmin = false,
  ) {
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException("You can only update your own organization's logo");
    }
    const org = await this.organizationModel.findOne({ _id: id });
    if (!org) throw new NotFoundException('Organization not found');
    org.logoUrl = logoUrl;
    await org.save();
    return this.withCounts(org);
  }

  /** Assign or remove a subscription plan. Clearing the core plan also clears
   *  the AI plan — an org without a core plan cannot have AI on its own. */
  async setPlan(id: string, planId: string | null): Promise<any> {
    const org = await this.organizationModel.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    org.planId = planId;
    if (planId === null) {
      (org as any).aiPlanId = null;
    }
    await org.save();
    return {
      id: org._id,
      name: org.name,
      planId: org.planId,
      aiPlanId: (org as any).aiPlanId ?? null,
    };
  }

  /** Assign or remove the AI subscription. AI requires an active core plan —
   *  setting a non-null aiPlanId on an org without a planId throws 400. */
  async setAiPlan(id: string, aiPlanId: string | null): Promise<any> {
    const org = await this.organizationModel.findById(id);
    if (!org) throw new NotFoundException('Organization not found');

    if (aiPlanId !== null) {
      if (!org.planId) {
        throw new BadRequestException('Choose a core plan before adding AI.');
      }
      const aiPlan = await this.aiPlanModel.findById(aiPlanId, { isActive: 1 }).lean();
      if (!aiPlan) throw new NotFoundException('AI plan not found');
      if (aiPlan.isActive === false) {
        throw new BadRequestException('Selected AI plan is inactive.');
      }
    }

    (org as any).aiPlanId = aiPlanId;
    await org.save();
    return {
      id: org._id,
      name: org.name,
      planId: org.planId,
      aiPlanId: (org as any).aiPlanId ?? null,
    };
  }

  async getStats(id: string, requestingOrgId: string, isSuperAdmin = false) {
    if (!isSuperAdmin && id !== requestingOrgId) {
      throw new ForbiddenException('Access denied');
    }

    const [userCount, projectCount, activeProjectCount] = await Promise.all([
      this.userModel.countDocuments({ organizationId: id }),
      this.projectModel.countDocuments({ organizationId: id }),
      this.projectModel.countDocuments({
        organizationId: id,
        status: ProjectStatus.ACTIVE,
      }),
    ]);

    return {
      totalUsers: userCount,
      totalProjects: projectCount,
      activeProjects: activeProjectCount,
    };
  }
}
