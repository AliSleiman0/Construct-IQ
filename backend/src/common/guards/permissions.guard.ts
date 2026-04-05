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

    return requiredPermissions.every((required) =>
      permissionNames.includes(required),
    );
  }
}
