import { PERMISSIONS } from '../../../common/constants/permissions';
import { satisfiesAll } from '../../../common/util/permission-check.util';

/**
 * AI capability registry — which agents a caller may reach.
 *
 * The orchestrator builds its classifier prompt from the caller's *allowed*
 * capabilities, so the model never learns that an out-of-scope agent exists;
 * it then re-checks the classification against the same list before
 * dispatching, so enforcement never depends on the model behaving.
 *
 * ADDING AN AGENT: add an entry here with the permissions it reads behind the
 * scenes, register the provider in ai.module.ts, and add the `case` in the
 * orchestrator switch. Per-user scoping then comes for free.
 */
export type AiCapabilityKey = 'navigation' | 'report-summary';

export interface AiCapability {
  key: AiCapabilityKey;
  /** One line describing the agent, injected into the classifier prompt. */
  promptLine: string;
  /** ALL must be satisfied by the caller's permissions. */
  requires: string[];
}

export const AI_CAPABILITIES: AiCapability[] = [
  {
    key: 'navigation',
    promptLine:
      '"navigation": the user wants to go to a section or page of the app. The sections available to this user are listed below.',
    // Everyone with use:ai may navigate; *where* they may go is filtered
    // separately by the navigation catalog.
    requires: [],
  },
  {
    key: 'report-summary',
    promptLine:
      '"report-summary": the user wants a daily site report summarized (requires reportId in payload)',
    requires: [PERMISSIONS.REPORTS.READ],
  },
];

/** The capabilities this caller's permissions unlock. */
export function resolveCapabilities(permissions: string[]): AiCapability[] {
  return AI_CAPABILITIES.filter((c) => satisfiesAll(permissions, c.requires));
}

/** Type guard: is `key` one of the caller's allowed capabilities? */
export function isAllowedCapability(
  allowed: AiCapability[],
  key: string,
): key is AiCapabilityKey {
  return allowed.some((c) => c.key === key);
}
