import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionStatus } from '../../common/enums';
import { seesAllProjects } from '../../common/util/project-scope.util';

@Controller('inspections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INSPECTIONS.READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('status') status?: InspectionStatus,
    @Query('type') type?: string,
  ): Promise<any> {
    const orgWide = seesAllProjects(user.isSuperAdmin, user.permissions, 'inspections');
    return this.inspectionsService.findAll(
      user.organizationId,
      user.isSuperAdmin,
      { projectId, status, type },
      { userId: user.sub, orgWide },
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INSPECTIONS.CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInspectionDto) {
    return this.inspectionsService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INSPECTIONS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.inspectionsService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.INSPECTIONS.UPDATE)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateInspectionDto,
  ) {
    return this.inspectionsService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.INSPECTIONS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.inspectionsService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
