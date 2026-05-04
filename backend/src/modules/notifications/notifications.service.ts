import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export interface CreateNotificationDto {
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async notify(dto: CreateNotificationDto): Promise<void> {
    await this.notificationModel.create({
      organizationId: dto.organizationId,
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      metadata: dto.metadata ?? null,
      isRead: false,
    });
  }

  async findAll(userId: string, organizationId: string): Promise<any[]> {
    return this.notificationModel
      .find({ userId, organizationId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  async markRead(id: string, userId: string): Promise<any> {
    const notification = await this.notificationModel.findOne({ _id: id, userId });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.isRead = true;
    await notification.save();
    return notification.toObject();
  }

  async markAllRead(userId: string, organizationId: string): Promise<any> {
    await this.notificationModel.updateMany(
      { userId, organizationId, isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }
}
