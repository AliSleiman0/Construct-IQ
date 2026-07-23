import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { TicketsService } from '../tickets/tickets.service';
import { CreateTicketDto } from '../tickets/dto/create-ticket.dto';
import { UpdateTicketDto } from '../tickets/dto/update-ticket.dto';
import { AddTicketCommentDto } from '../tickets/dto/add-ticket-comment.dto';
import { satisfiesPermission } from '../../common/util/permission-check.util';
import type { TicketViewer } from '../tickets/tickets.service';

/** Same reporter-scoping as TicketsController — see TicketViewer. */
const ticketViewer = (user: JwtPayload): TicketViewer => ({
  userId: user.sub,
  canTriage: satisfiesPermission(user.permissions ?? [], PERMISSIONS.TICKETS.MANAGE),
});

@Controller('support-tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupportTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TICKETS.READ)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.ticketsService.findAll(
      user.organizationId,
      user.isSuperAdmin,
      undefined,
      undefined,
      undefined,
      undefined,
      ticketViewer(user),
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TICKETS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.findById(id, user.organizationId, user.isSuperAdmin, ticketViewer(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TICKETS.CREATE)
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.create(user.organizationId, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TICKETS.MANAGE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ticketsService.update(id, user.organizationId, dto, user.sub, user.isSuperAdmin);
  }

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.TICKETS.MANAGE)
  addComment(
    @Param('id') id: string,
    @Body() dto: AddTicketCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ticketsService.addComment(id, user.organizationId, user.sub, dto, user.isSuperAdmin);
  }
}
