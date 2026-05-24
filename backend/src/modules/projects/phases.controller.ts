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
import { PhasesService } from './phases.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Controller('projects/:projectId/phases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PHASES.READ)
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.phasesService.findAll(projectId, user.organizationId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PHASES.MANAGE)
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePhaseDto,
  ): Promise<any> {
    return this.phasesService.create(projectId, user.organizationId, dto);
  }

  @Patch(':phaseId')
  @RequirePermissions(PERMISSIONS.PHASES.MANAGE)
  update(
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePhaseDto,
  ): Promise<any> {
    return this.phasesService.update(phaseId, projectId, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':phaseId')
  @RequirePermissions(PERMISSIONS.PHASES.MANAGE)
  remove(
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.phasesService.remove(phaseId, projectId, user.organizationId, user.isSuperAdmin);
  }
}
