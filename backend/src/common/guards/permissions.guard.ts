import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  User,
  UserDocument,
} from '../../modules/users/schemas/user.schema';
import {
  Role,
  RoleDocument,
} from '../../modules/users/schemas/role.schema';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
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

    // Look up the user's role IDs, then aggregate the embedded permissionKeys.
    // One indexed query per request — substantially cheaper than the old
    // 4-table relational join.
    const userDoc = await this.userModel
      .findOne({ _id: user.sub }, { roleIds: 1 })
      .lean();
    if (!userDoc || userDoc.roleIds.length === 0) return false;

    const roles = await this.roleModel
      .find({ _id: { $in: userDoc.roleIds } }, { permissionKeys: 1 })
      .lean();

    const permissionNames = roles.flatMap((r) => r.permissionKeys ?? []);

    // Super Admin with manage:all bypasses every permission check
    if (permissionNames.includes('manage:all')) {
      return true;
    }

    // Company Admin with manage:company bypasses all checks within their org
    // (org scoping is enforced at service layer, not here)
    if (permissionNames.includes('manage:company')) {
      return true;
    }

    // Hierarchical check: manage:<resource> satisfies read/create/update/delete:<resource>
    const satisfies = (required: string): boolean => {
      if (permissionNames.includes(required)) return true;
      const match = required.match(
        /^(?:read|create|update|delete|assign|approve|upload|use):(.+)$/,
      );
      if (match) return permissionNames.includes(`manage:${match[1]}`);
      return false;
    };

    return requiredPermissions.every(satisfies);
  }
}
