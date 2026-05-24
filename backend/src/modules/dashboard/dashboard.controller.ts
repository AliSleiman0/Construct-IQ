import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('org')
  @RequirePermissions(PERMISSIONS.DASHBOARD.READ)
  getOrgDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getOrgDashboard(user.organizationId);
  }

  @Get('pm')
  @RequirePermissions(PERMISSIONS.DASHBOARD.READ)
  getPmDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getPmDashboard(user.organizationId, user.sub);
  }

  @Get('site-eng')
  @RequirePermissions(PERMISSIONS.DASHBOARD.READ)
  getSiteEngDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getSiteEngDashboard(user.organizationId, user.sub);
  }
}
