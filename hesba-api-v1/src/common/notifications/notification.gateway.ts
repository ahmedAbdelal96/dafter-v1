import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { CacheService } from '../cache/cache.service';

/**
 * Notification WebSocket Gateway
 *
 * يوفر:
 * - بث الإخطارات الفورية للعملاء المتصلين
 * - تتبع الاتصالات النشطة
 * - تحديث الإخطارات في الوقت الفعلي
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger(NotificationGateway.name);
  private userConnections = new Map<string, Set<string>>(); // userId -> Set<socketIds>

  constructor(
    private notificationService: NotificationService,
    private cacheService: CacheService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('✅ WebSocket Gateway Initialized');
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const userId = socket.handshake.query.userId as string;

      if (!userId) {
        socket.disconnect();
        this.logger.warn('Connection rejected: No userId provided');
        return;
      }

      // إضافة Socket إلى مجموعة المستخدم
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.add(socket.id);
      }

      // الانضمام إلى غرفة خاصة بالمستخدم
      socket.join(`user:${userId}`);

      this.logger.log(`User ${userId} connected (socket: ${socket.id})`);

      // إرسال الإخطارات غير المقروءة عند الاتصال
      const unreadNotifications =
        await this.notificationService.getUnreadNotifications(userId);
      socket.emit('unread_notifications', unreadNotifications);

      // إرسال عدد الإخطارات غير المقروءة
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const userId = socket.handshake.query.userId as string;

      if (!userId) {
        return;
      }

      const connections = this.userConnections.get(userId);
      if (connections) {
        connections.delete(socket.id);

        if (connections.size === 0) {
          this.userConnections.delete(userId);
          this.logger.log(`User ${userId} disconnected (all sockets)`);
        } else {
          this.logger.log(
            `User ${userId} socket disconnected (${connections.size} remaining)`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Event: mark notification as read
   */
  @SubscribeMessage('mark_notification_read')
  async markNotificationRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { notificationId: string },
  ): Promise<void> {
    try {
      const userId = socket.handshake.query.userId as string;
      await this.notificationService.markAsRead(data.notificationId, userId);

      // تحديث عدد الإخطارات غير المقروءة
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });

      this.logger.debug(`Notification ${data.notificationId} marked as read`);
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`);
    }
  }

  /**
   * Event: delete notification
   */
  @SubscribeMessage('delete_notification')
  async deleteNotification(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { notificationId: string },
  ): Promise<void> {
    try {
      const userId = socket.handshake.query.userId as string;
      await this.notificationService.delete(data.notificationId, userId);

      // تحديث عدد الإخطارات غير المقروءة
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });

      this.logger.debug(`Notification ${data.notificationId} deleted`);
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`);
    }
  }

  /**
   * Event: get notifications
   */
  @SubscribeMessage('get_notifications')
  async getNotifications(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { limit?: number },
  ): Promise<void> {
    try {
      const userId = socket.handshake.query.userId as string;
      const limit = data?.limit || 50;

      const notifications = await this.notificationService.getUserNotifications(
        userId,
        limit,
      );
      socket.emit('notifications', notifications);

      this.logger.debug(
        `Sent ${notifications.length} notifications to user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error getting notifications: ${error.message}`);
    }
  }

  /**
   * Event: mark all as read
   */
  @SubscribeMessage('mark_all_read')
  async markAllAsRead(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const userId = socket.handshake.query.userId as string;
      const updated = await this.notificationService.markAllAsRead(userId);

      socket.emit('notifications_marked_read', { updated });
      socket.emit('unread_count', { count: 0 });

      this.logger.log(
        `${updated} notifications marked as read for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error marking all as read: ${error.message}`);
    }
  }

  /**
   * بث إخطار إلى مستخدم محدد
   * (استدعاء من service)
   */
  notifyUser(userId: string, notification: any): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('new_notification', notification);
    this.logger.debug(`Notification sent to user ${userId}`);
  }

  /**
   * بث إخطار إلى عدة مستخدمين
   */
  notifyUsers(userIds: string[], notification: any): void {
    for (const userId of userIds) {
      this.notifyUser(userId, notification);
    }
  }

  /**
   * بث إخطار إلى الجميع
   */
  notifyAll(notification: any): void {
    this.server.emit('new_notification', notification);
    this.logger.debug('Notification sent to all connected users');
  }

  /**
   * الحصول على عدد المستخدمين المتصلين
   */
  getConnectedUsersCount(): number {
    return this.userConnections.size;
  }

  /**
   * الحصول على معلومات المستخدمين المتصلين
   */
  getConnectedUsersInfo(): { userId: string; socketCount: number }[] {
    const info: { userId: string; socketCount: number }[] = [];
    for (const [userId, sockets] of this.userConnections.entries()) {
      info.push({
        userId,
        socketCount: sockets.size,
      });
    }
    return info;
  }

  /**
   * التحقق من وجود مستخدم متصل
   */
  isUserConnected(userId: string): boolean {
    const connections = this.userConnections.get(userId);
    return connections ? connections.size > 0 : false;
  }
}
