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
import { TaskStatus } from '../../common/enums';

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
    return this.tasksService.findAll(
      user.organizationId,
      user.isSuperAdmin,
      projectId,
      assignedToId,
      status,
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

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TASKS.DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.tasksService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
