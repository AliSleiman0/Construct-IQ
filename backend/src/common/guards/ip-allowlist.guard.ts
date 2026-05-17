import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// `ip-range-check` is published as `export =`, so use require-style interop
// (tsconfig has no esModuleInterop).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ipRangeCheck: (
  addr: string,
  range: string | string[],
) => boolean = require('ip-range-check');
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OrgSettingsService } from '../../modules/org-settings/org-settings.service';

/** Enforces the per-org `OrgSettings.allowedIps` list. Runs AFTER `JwtAuthGuard`
 *  (it relies on `request.user`). Super Admins always bypass. Empty allowlist
 *  means "allow all".
 *
 *  Relies on Express `trust proxy` being enabled in main.ts so `request.ip`
 *  reflects the original client through any reverse proxy. */
@Injectable()
export class IpAllowlistGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly orgSettingsService: OrgSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No authenticated user → JwtAuthGuard will have already rejected.
    if (!user) return true;

    // Super Admins bypass — recovery path if an org admin misconfigures.
    if (user.isSuperAdmin) return true;

    const organizationId: string | undefined = user.organizationId;
    if (!organizationId) return true;

    const settings = await this.orgSettingsService.get(organizationId);
    const allowed: string[] = settings?.allowedIps ?? [];
    if (allowed.length === 0) return true;

    const ip = this.resolveClientIp(request);
    if (!ip) {
      throw new ForbiddenException('Access denied: client IP unavailable.');
    }

    if (!ipRangeCheck(ip, allowed)) {
      throw new ForbiddenException('Access denied from this network.');
    }

    return true;
  }

  private resolveClientIp(request: any): string | null {
    // Express populates `req.ip` correctly when `trust proxy` is set.
    let ip: string | undefined = request.ip;
    if (!ip) return null;
    // Strip IPv4-mapped IPv6 prefix (e.g. `::ffff:1.2.3.4` → `1.2.3.4`) so
    // CIDR matching works against plain IPv4 entries.
    if (ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length);
    return ip;
  }
}
