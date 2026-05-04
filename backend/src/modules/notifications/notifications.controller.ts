import { Controller, Get, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<any> {
    return this.notificationsService.findAll(user.sub, user.organizationId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: JwtPayload): Promise<any> {
    return this.notificationsService.markAllRead(user.sub, user.organizationId);
  }
}
