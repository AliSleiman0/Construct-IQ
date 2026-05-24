import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MILESTONES.READ)
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.milestonesService.findAll(projectId, user.organizationId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MILESTONES.MANAGE)
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMilestoneDto,
  ): Promise<any> {
    return this.milestonesService.create(projectId, user.organizationId, dto);
  }

  @Patch(':milestoneId')
  @RequirePermissions(PERMISSIONS.MILESTONES.MANAGE)
  update(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMilestoneDto,
  ): Promise<any> {
    return this.milestonesService.update(milestoneId, projectId, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':milestoneId')
  @RequirePermissions(PERMISSIONS.MILESTONES.MANAGE)
  remove(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.milestonesService.remove(milestoneId, projectId, user.organizationId, user.isSuperAdmin);
  }
}
