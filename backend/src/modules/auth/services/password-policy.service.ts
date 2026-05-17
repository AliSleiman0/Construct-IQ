import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgSettingsService } from '../../org-settings/org-settings.service';

/** Enforces the org's `passwordPolicy` (standard | strong | strict) at the
 *  point a password is set or changed. Super-admin / org-less callers fall
 *  back to the `standard` policy.
 *
 *  Tiers:
 *    - standard → 8+ chars, mixed case, ≥1 digit
 *    - strong   → 12+ chars, mixed case, ≥1 digit, ≥1 special
 *    - strict   → 14+ chars, all of strong, no whitespace
 *
 *  TODO: password history / no-reuse and rotation checks. Both require a
 *  separate `passwordHistory` collection and aren't covered here. */
@Injectable()
export class PasswordPolicyService {
  constructor(private readonly orgSettingsService: OrgSettingsService) {}

  async validate(password: string, organizationId: string | null): Promise<void> {
    const policy = await this.resolvePolicy(organizationId);
    const errors = this.checkAgainstPolicy(password, policy);
    if (errors.length > 0) {
      throw new BadRequestException(errors[0]);
    }
  }

  private async resolvePolicy(organizationId: string | null): Promise<string> {
    if (!organizationId) return 'standard';
    const settings = await this.orgSettingsService.get(organizationId);
    return settings?.passwordPolicy ?? 'standard';
  }

  private checkAgainstPolicy(password: string, policy: string): string[] {
    const errors: string[] = [];

    const minLength =
      policy === 'strict' ? 14 : policy === 'strong' ? 12 : 8;
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters.`);
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit.');
    }
    if (
      (policy === 'strong' || policy === 'strict') &&
      !/[^A-Za-z0-9]/.test(password)
    ) {
      errors.push('Password must contain at least one special character.');
    }
    if (policy === 'strict' && /\s/.test(password)) {
      errors.push('Password must not contain whitespace.');
    }

    return errors;
  }
}
