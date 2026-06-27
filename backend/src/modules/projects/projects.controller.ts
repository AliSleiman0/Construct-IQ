import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECTS.CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.organizationId, user.sub, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.projectsService.findAll(
      user.organizationId,
      user.sub,
      user.isSuperAdmin,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.findById(id, user.organizationId, user.sub, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.UPDATE)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.softDelete(id, user.organizationId, user.isSuperAdmin, user.sub);
  }

  @Post(':id/members')
  @RequirePermissions(PERMISSIONS.PROJECTS.ASSIGN_MEMBERS)
  addMember(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(id, user.organizationId, dto);
  }

  @Patch(':id/members/:userId')
  @RequirePermissions(PERMISSIONS.PROJECTS.ASSIGN_MEMBERS)
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMember(id, user.organizationId, userId, dto);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions(PERMISSIONS.PROJECTS.ASSIGN_MEMBERS)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.removeMember(id, user.organizationId, userId);
  }

  // ── Client Portal ──────────────────────────────────────────────────────

  @Get(':id/client-portal')
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  getClientPortalInfo(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.getClientPortalInfo(
      id,
      user.organizationId,
      user.sub,
      user.isSuperAdmin,
    );
  }

  @Post(':id/client-portal/regenerate')
  @RequirePermissions(PERMISSIONS.PROJECTS.UPDATE)
  @HttpCode(HttpStatus.OK)
  regenerateClientPortalToken(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.regenerateClientPortalToken(
      id,
      user.organizationId,
      user.isSuperAdmin,
    );
  }

  @Patch(':id/client-portal/toggle')
  @RequirePermissions(PERMISSIONS.PROJECTS.UPDATE)
  toggleClientPortal(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('enabled') enabled: boolean,
  ) {
    return this.projectsService.toggleClientPortal(
      id,
      user.organizationId,
      enabled,
      user.isSuperAdmin,
    );
  }

  // ── AutoCAD Engineer Portal ──────────────────────────────────────────────

  @Get(':id/autocad-link')
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  getAutocadLinkInfo(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.getAutocadLinkInfo(
      id,
      user.organizationId,
      user.sub,
      user.isSuperAdmin,
    );
  }

  @Post(':id/autocad-link/regenerate')
  @RequirePermissions(PERMISSIONS.PROJECTS.UPDATE)
  @HttpCode(HttpStatus.OK)
  regenerateAutocadToken(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.regenerateAutocadToken(
      id,
      user.organizationId,
      user.isSuperAdmin,
    );
  }

  @Patch(':id/autocad-link/toggle')
  @RequirePermissions(PERMISSIONS.PROJECTS.UPDATE)
  toggleAutocadLink(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('enabled') enabled: boolean,
  ) {
    return this.projectsService.toggleAutocadLink(
      id,
      user.organizationId,
      enabled,
      user.isSuperAdmin,
    );
  }
}
