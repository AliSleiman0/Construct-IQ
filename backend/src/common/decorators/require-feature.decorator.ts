import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../constants/platform-features';

export const FEATURE_KEY = 'required_feature';

/** Mark a route as requiring a specific plan feature.
 *  Used together with FeatureGuard.
 *  Example: @RequireFeature(PLATFORM_FEATURES.AI_ASSISTANT.key)
 */
export const RequireFeature = (featureKey: FeatureKey | string) =>
  SetMetadata(FEATURE_KEY, featureKey);
