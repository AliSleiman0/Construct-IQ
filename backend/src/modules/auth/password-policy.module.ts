import { Module } from '@nestjs/common';
import { OrgSettingsModule } from '../org-settings/org-settings.module';
import { PasswordPolicyService } from './services/password-policy.service';

/** Slim module exposing only the password-policy validator. Kept separate
 *  from `AuthModule` to avoid a circular dependency: `UsersModule` needs
 *  password validation on user create, and `AuthModule` already imports
 *  `UsersModule`. */
@Module({
  imports: [OrgSettingsModule],
  providers: [PasswordPolicyService],
  exports: [PasswordPolicyService],
})
export class PasswordPolicyModule {}
