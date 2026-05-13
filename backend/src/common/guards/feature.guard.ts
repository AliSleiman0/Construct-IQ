import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { Organization } from '../../modules/organizations/schemas/organization.schema';
import { Plan } from '../../modules/plans/schemas/plan.schema';

/**
 * Checks that the current org's subscribed plan includes the feature key
 * specified by @RequireFeature().
 *
 * Super admins bypass this check (they have access to everything).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, FeatureGuard)
 *   @RequireFeature(PLATFORM_FEATURES.AI_ASSISTANT.key)
 *   @Get('chat')
 *   chat(...) {}
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Organization.name) private orgModel: Model<any>,
    @InjectModel(Plan.name) private planModel: Model<any>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No feature requirement on this route — let it through
    if (!requiredKey) return true;

    const { user } = context.switchToHttp().getRequest();

    // Super admins are never blocked by feature gates
    if (user?.isSuperAdmin) return true;

    const organizationId = user?.organizationId;
    if (!organizationId) throw new ForbiddenException('No organization context');

    const org = await this.orgModel.findById(organizationId, { planId: 1 }).lean() as any;
    if (!org?.planId) {
      throw new ForbiddenException(`Your organization has no active plan. Feature "${requiredKey}" is unavailable.`);
    }

    const plan = await this.planModel.findById(org.planId, { features: 1 }).lean() as any;
    if (!plan) {
      throw new ForbiddenException('Subscribed plan not found');
    }

    const hasFeature = Array.isArray(plan.features) && plan.features.includes(requiredKey);
    if (!hasFeature) {
      throw new ForbiddenException(`Your current plan does not include the "${requiredKey}" feature.`);
    }

    return true;
  }
}
