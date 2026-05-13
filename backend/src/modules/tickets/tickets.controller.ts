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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddTicketCommentDto } from './dto/add-ticket-comment.dto';
import { TicketStatus, TicketPriority } from '../../common/enums';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TICKETS.READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('reporterId') reporterId?: string,
    @Query('assigneeId') assigneeId?: string,
  ): Promise<any> {
    return this.ticketsService.findAll(user.organizationId, user.isSuperAdmin, status, priority, reporterId, assigneeId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TICKETS.READ)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto): Promise<any> {
    return this.ticketsService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TICKETS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.ticketsService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TICKETS.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateTicketDto): Promise<any> {
    return this.ticketsService.update(id, user.organizationId, dto, user.sub, user.isSuperAdmin);
  }

  @Patch(':id/assign')
  @RequirePermissions(PERMISSIONS.TICKETS.MANAGE)
  assign(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body('assigneeId') assigneeId: string): Promise<any> {
    return this.ticketsService.assign(id, user.organizationId, assigneeId, user.isSuperAdmin);
  }

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.TICKETS.READ)
  addComment(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: AddTicketCommentDto): Promise<any> {
    return this.ticketsService.addComment(id, user.organizationId, user.sub, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TICKETS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.ticketsService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
