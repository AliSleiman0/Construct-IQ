import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('support-tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SUPPORT_TICKETS.READ)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.ticketsService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPORT_TICKETS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.findById(id, user.organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SUPPORT_TICKETS.CREATE)
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.create(dto, user.organizationId, user.sub);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SUPPORT_TICKETS.UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ticketsService.update(id, dto, user.organizationId);
  }

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.SUPPORT_TICKETS.READ)
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ticketsService.addComment(id, dto, user.organizationId, user.sub);
  }
}
