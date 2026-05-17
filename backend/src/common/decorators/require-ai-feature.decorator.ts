import { SetMetadata } from '@nestjs/common';
import { AiFeatureKey } from '../constants/ai-features';

export const AI_FEATURE_KEY = 'required_ai_feature';

/** Mark a route as requiring a specific AI feature in the org's AI plan.
 *  Used together with AiFeatureGuard.
 *  Example: @RequireAiFeature(AI_FEATURES.AI_ASSISTANT.key)
 */
export const RequireAiFeature = (featureKey: AiFeatureKey | string) =>
  SetMetadata(AI_FEATURE_KEY, featureKey);
