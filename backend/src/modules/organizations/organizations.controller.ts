import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
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
import { IsBoolean } from 'class-validator';

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /** Super Admin only — list all organizations on the platform */
  @Get()
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.MANAGE)
  findAll() {
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
  findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
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
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.organizationsService.setActive(id, dto.isActive);
  }

  @Get(':id/stats')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  getStats(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.getStats(id, user.organizationId, user.isSuperAdmin);
  }
}
