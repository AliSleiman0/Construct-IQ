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
import { satisfiesPermission } from '../util/permission-check.util';

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
      .find({ _id: { $in: userDoc.roleIds } }, { permissionKeys: 1, name: 1 })
      .lean();

    const permissionNames = roles.flatMap((r) => r.permissionKeys ?? []);

    // Expose the resolved permissions and role names on the request so
    // controllers/services can make scoping decisions (e.g. member-scoped vs
    // org-wide list queries, or which AI capabilities a caller may reach)
    // without re-querying. The JWT itself carries neither.
    (user as { permissions?: string[] }).permissions = permissionNames;
    (user as { roles?: string[] }).roles = roles.map((r) => r.name);

    // Wildcards (manage:all / manage:company) and the manage:<resource>
    // hierarchy are handled by the shared helper — see permission-check.util.
    return requiredPermissions.every((required) =>
      satisfiesPermission(permissionNames, required),
    );
  }
}
