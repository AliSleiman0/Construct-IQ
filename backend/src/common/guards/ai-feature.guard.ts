import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AI_FEATURE_KEY } from '../decorators/require-ai-feature.decorator';
import { Organization } from '../../modules/organizations/schemas/organization.schema';
import { AiPlan } from '../../modules/ai-plans/schemas/ai-plan.schema';

/**
 * Checks that the current org's AI subscription includes the AI feature key
 * specified by @RequireAiFeature().
 *
 * Super Admins bypass this check.
 *
 * Resolution: request.user.organizationId → Organization.aiPlanId →
 * AiPlan.features[] → contains required key?
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, AiFeatureGuard)
 *   @RequireAiFeature('ai_assistant')
 *   @Post('chat')
 *   chat(...) {}
 */
@Injectable()
export class AiFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Organization.name) private orgModel: Model<any>,
    @InjectModel(AiPlan.name) private aiPlanModel: Model<any>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredKey = this.reflector.getAllAndOverride<string>(AI_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No AI feature requirement on this route — pass through.
    if (!requiredKey) return true;

    const { user } = context.switchToHttp().getRequest();

    // Super Admins are never blocked by AI feature gates.
    if (user?.isSuperAdmin) return true;

    const organizationId = user?.organizationId;
    if (!organizationId) throw new ForbiddenException('No organization context');

    const org = await this.orgModel
      .findById(organizationId, { aiPlanId: 1 })
      .lean() as any;
    if (!org?.aiPlanId) {
      throw new ForbiddenException(
        'Your organization does not have an AI subscription.',
      );
    }

    const plan = await this.aiPlanModel
      .findById(org.aiPlanId, { features: 1, isActive: 1 })
      .lean() as any;
    if (!plan || plan.isActive === false) {
      throw new ForbiddenException('Subscribed AI plan not found or inactive');
    }

    const hasFeature = Array.isArray(plan.features) && plan.features.includes(requiredKey);
    if (!hasFeature) {
      throw new ForbiddenException(
        'This AI capability is not included in your AI plan.',
      );
    }

    return true;
  }
}
