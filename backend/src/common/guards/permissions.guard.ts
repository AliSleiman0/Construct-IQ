import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const userPermissions = await this.prisma.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: { userId: user.sub },
              },
            },
          },
        },
      },
      select: { name: true },
    });

    const permissionNames = userPermissions.map((p: { name: any; }) => p.name);

    // Super Admin with manage:all bypasses every permission check
    if (permissionNames.includes('manage:all')) {
      return true;
    }

    // Hierarchical check: manage:<resource> satisfies read/create/update/delete:<resource>
    const satisfies = (required: string): boolean => {
      if (permissionNames.includes(required)) return true;
      const match = required.match(/^(?:read|create|update|delete|assign|approve|upload|use):(.+)$/);
      if (match) return permissionNames.includes(`manage:${match[1]}`);
      return false;
    };

    return requiredPermissions.every(satisfies);
  }
}
