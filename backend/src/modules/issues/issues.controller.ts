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
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { AddIssueCommentDto } from './dto/add-issue-comment.dto';
import { IssueStatus } from '../../common/enums';

@Controller('issues')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ISSUES.READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('status') status?: IssueStatus,
    @Query('severity') severity?: string,
  ): Promise<any> {
    return this.issuesService.findAll(
      user.organizationId,
      user.isSuperAdmin,
      projectId,
      status,
      severity,
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ISSUES.CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateIssueDto) {
    return this.issuesService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ISSUES.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.issuesService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ISSUES.UPDATE)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issuesService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Patch(':id/assign')
  @RequirePermissions(PERMISSIONS.ISSUES.ASSIGN)
  assign(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('assignedToId') assignedToId: string,
  ) {
    return this.issuesService.assign(id, user.organizationId, assignedToId, user.isSuperAdmin);
  }

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.ISSUES.UPDATE)
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddIssueCommentDto,
  ) {
    return this.issuesService.addComment(id, user.organizationId, user.sub, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ISSUES.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.issuesService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
