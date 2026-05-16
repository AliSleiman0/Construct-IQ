import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Users')
@ApiCookieAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── Roles lookup (used by UI dropdowns) ────────────────────────────────

  @Get('roles')
  @RequirePermissions(PERMISSIONS.USERS.READ)
  @ApiOperation({ summary: 'List roles available in the current organization' })
  listRoles(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAllRoles(user.organizationId, user.isSuperAdmin);
  }

  // ── Cross-org Org Admin list (SA only) ─────────────────────────────────

  @Get('org-admins')
  @RequirePermissions(PERMISSIONS.ALL)
  @ApiOperation({ summary: 'Super Admin: list all Org Admins across every organization' })
  listOrgAdmins(@CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException(
        'Only Super Admins can list Org Admins across organizations',
      );
    }
    return this.usersService.findAllOrgAdmins();
  }

  // ── Own profile ────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  // ── Organization users ─────────────────────────────────────────────────

  @Get()
  @RequirePermissions(PERMISSIONS.USERS.READ)
  @ApiOperation({ summary: 'List users (own org; Super Admin sees selected company or all orgs)' })
  findAll(@CurrentUser() user: JwtPayload) {
    // Super Admin in company context (X-Organization-Id header was applied by interceptor)
    // → show only that company's users so the page is scoped correctly
    if (user.isSuperAdmin && user.organizationId) {
      return this.usersService.findAllByOrganization(user.organizationId);
    }
    // Super Admin with no company selected → global list
    if (user.isSuperAdmin) {
      return this.usersService.findAllGlobal();
    }
    return this.usersService.findAllByOrganization(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS.READ)
  @ApiOperation({ summary: 'Get a single user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.USERS.CREATE)
  @ApiOperation({ summary: 'Create a new user and assign their role' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.organizationId, dto);
  }

  @Post('org-admins')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.ALL)
  @ApiOperation({ summary: 'Super Admin: create an Org Admin in any organization' })
  createOrgAdmin(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrgAdminDto,
  ) {
    // PermissionsGuard treats `manage:company` as a bypass too, so we need
    // an explicit SA check to prevent an Org Admin from provisioning admins
    // in other tenants.
    if (!user.isSuperAdmin) {
      throw new ForbiddenException(
        'Only Super Admins can create Org Admins across organizations',
      );
    }
    return this.usersService.createOrgAdmin(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS.UPDATE)
  @ApiOperation({ summary: 'Update user details (name, phone, status)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS.DELETE)
  @ApiOperation({ summary: 'Deactivate (soft-delete) a user' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.softDelete(id, user.organizationId);
  }

  // ── Role assignment ────────────────────────────────────────────────────

  @Post(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS.MANAGE)
  @ApiOperation({ summary: 'Assign an additional role to a user' })
  assignRole(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(id, user.organizationId, dto.roleId);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions(PERMISSIONS.USERS.MANAGE)
  @ApiOperation({ summary: 'Remove a role from a user' })
  removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.removeRole(id, user.organizationId, roleId);
  }
}

