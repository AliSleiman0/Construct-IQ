import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { seesAllProjects } from '../../common/util/project-scope.util';
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

  // Buyer-scoped, not member-scoped: a CLIENT belongs to no project, so this
  // resolves everything from the unit they own.
  @Get('client')
  @RequirePermissions(PERMISSIONS.DASHBOARD.READ)
  getClientDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getClientDashboard(user.organizationId, user.sub);
  }

  @Get('surveyor')
  @RequirePermissions(PERMISSIONS.DASHBOARD.READ)
  getSurveyorDashboard(@CurrentUser() user: JwtPayload) {
    // Mirror the surveyor list scoping: manage:budget → org-wide; else member-scoped.
    const orgWide = seesAllProjects(user.isSuperAdmin, user.permissions, 'budget');
    return this.dashboardService.getSurveyorDashboard(user.organizationId, user.sub, orgWide);
  }
}
