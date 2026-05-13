import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

class SetPlanDto {
  @IsOptional()
  @IsString()
  planId!: string | null;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /** Super Admin only — list all organizations on the platform */
  @Get()
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  findAll(@CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can list all organizations');
    }
    return this.organizationsService.findAll();
  }

  /** Super Admin only — provision a new tenant */
  @Post()
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.MANAGE)
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.organizationsService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  /** Super Admin only — suspend / reactivate a tenant */
  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.MANAGE)
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto, @CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can change organization status');
    }
    return this.organizationsService.setActive(id, dto.isActive);
  }

  /** Super Admin only — assign a subscription plan to an org */
  @Patch(':id/plan')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.MANAGE)
  setPlan(@Param('id') id: string, @Body() dto: SetPlanDto, @CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can set organization plans');
    }
    return this.organizationsService.setPlan(id, dto.planId ?? null);
  }

  @Get(':id/stats')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  getStats(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.getStats(id, user.organizationId, user.isSuperAdmin);
  }
}
