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
import { RfisService } from './rfis.service';
import { CreateRfiDto } from './dto/create-rfi.dto';
import { UpdateRfiDto } from './dto/update-rfi.dto';
import { AnswerRfiDto } from './dto/answer-rfi.dto';
import { RfiStatus } from '../../common/enums';
import { seesAllProjects } from '../../common/util/project-scope.util';

@Controller('rfis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RfisController {
  constructor(private readonly rfisService: RfisService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RFIS.READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('status') status?: RfiStatus,
    @Query('discipline') discipline?: string,
  ): Promise<any> {
    const orgWide = seesAllProjects(user.isSuperAdmin, user.permissions, 'rfis');
    return this.rfisService.findAll(
      user.organizationId,
      user.isSuperAdmin,
      { projectId, status, discipline },
      { userId: user.sub, orgWide },
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.RFIS.CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRfiDto) {
    return this.rfisService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.RFIS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.rfisService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.RFIS.UPDATE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateRfiDto) {
    return this.rfisService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  // Answering is a manager-only action (PM holds manage:rfis; SITE_ENG does not).
  @Post(':id/answer')
  @RequirePermissions(PERMISSIONS.RFIS.MANAGE)
  answer(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: AnswerRfiDto) {
    return this.rfisService.answer(id, user, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.RFIS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.rfisService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
