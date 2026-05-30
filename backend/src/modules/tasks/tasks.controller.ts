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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { AddTaskCommentDto } from './dto/add-task-comment.dto';
import { TaskStatus } from '../../common/enums';
import { seesAllProjects } from '../../common/util/project-scope.util';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TASKS.READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('status') status?: TaskStatus,
  ): Promise<any> {
    const orgWide = seesAllProjects(user.isSuperAdmin, user.permissions, 'tasks');
    return this.tasksService.findAll(
      user.organizationId,
      user.isSuperAdmin,
      projectId,
      assignedToId,
      status,
      { userId: user.sub, orgWide },
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TASKS.CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto): Promise<any> {
    return this.tasksService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TASKS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.tasksService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  // Must precede @Patch(':id') so 'reorder' isn't captured as an :id.
  @Patch('reorder')
  @RequirePermissions(PERMISSIONS.TASKS.UPDATE)
  reorder(@CurrentUser() user: JwtPayload, @Body() dto: ReorderTasksDto): Promise<any> {
    return this.tasksService.reorder(
      user.organizationId,
      user.isSuperAdmin,
      dto.status,
      dto.taskIds,
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TASKS.UPDATE)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskDto,
  ): Promise<any> {
    return this.tasksService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Patch(':id/assign')
  @RequirePermissions(PERMISSIONS.TASKS.ASSIGN)
  assign(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('assignedToId') assignedToId: string,
  ): Promise<any> {
    return this.tasksService.assign(id, user.organizationId, assignedToId, user.isSuperAdmin);
  }

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.TASKS.UPDATE)
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddTaskCommentDto,
  ): Promise<any> {
    return this.tasksService.addComment(id, user.organizationId, user.sub, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TASKS.DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.tasksService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
