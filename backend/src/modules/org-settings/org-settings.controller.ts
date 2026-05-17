import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { OrgSettingsService } from './org-settings.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

@Controller('org-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgSettingsController {
  constructor(private readonly settingsService: OrgSettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS.READ)
  get(@CurrentUser() user: JwtPayload): Promise<any> {
    return this.settingsService.get(user.organizationId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.SETTINGS.UPDATE)
  update(
    @Body() dto: UpdateOrgSettingsDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<any> {
    return this.settingsService.update(user.organizationId, dto, {
      actorUserId: user.sub,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
  }
}
