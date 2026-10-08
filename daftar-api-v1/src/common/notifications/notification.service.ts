import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ALERT = 'ALERT',
}

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ICreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  data?: Record<string, any>;
  ttl?: number; // بالثواني (مدة تخزين الإخطار)
}

export interface INotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

/**
 * Notification Service
 * يدير الإخطارات للمستخدمين باستخدام Redis
 *
 * الميزات:
 * - تخزين الإخطارات في Redis
 * - تتبع الإخطارات المقروءة/غير المقروءة
 * - الحصول على إخطارات المستخدم
 * - تنظيف الإخطارات المنتهية الصلاحية
 */
@Injectable()
export class NotificationService {
  private logger = new Logger(NotificationService.name);
  private readonly DEFAULT_TTL = 30 * 24 * 60 * 60; // 30 يوم

  constructor(private cacheService: CacheService) {}

  /**
   * إنشاء إخطار جديد
   */
  async create(notification: ICreateNotification): Promise<INotification> {
    try {
      const id = this.generateNotificationId();
      const now = new Date();
      const ttl = notification.ttl || this.DEFAULT_TTL;

      const newNotification: INotification = {
        id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        titleAr: notification.titleAr,
        message: notification.message,
        messageAr: notification.messageAr,
        data: notification.data,
        read: false,
        createdAt: now,
        expiresAt: new Date(now.getTime() + ttl * 1000),
      };

      // حفظ الإخطار
      const userNotificationsKey = `notifications:${notification.userId}`;
      await this.cacheService.pushList(
        userNotificationsKey,
        [newNotification],
        'notifications',
      );

      // حفظ الإخطار بشكل منفصل للوصول السريع
      const notificationKey = `notification:${id}`;
      await this.cacheService.set(notificationKey, newNotification, {
        ttl,
        namespace: 'notifications',
      });

      // تحديث عداد الإخطارات غير المقروءة
      const unreadCountKey = `unread:${notification.userId}`;
      await this.cacheService.increment(unreadCountKey, 1, 'notifications');

      this.logger.log(
        `Notification created: ${id} for user ${notification.userId}`,
      );

      return newNotification;
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على إخطارات المستخدم
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<INotification[]> {
    try {
      const key = `notifications:${userId}`;
      const notifications = await this.cacheService.getList<INotification>(
        key,
        -limit,
        -1,
        'notifications',
      );

      return notifications.reverse();
    } catch (error) {
      this.logger.error(`Error fetching user notifications: ${error.message}`);
      return [];
    }
  }

  /**
   * الحصول على الإخطارات غير المقروءة
   */
  async getUnreadNotifications(userId: string): Promise<INotification[]> {
    try {
      const notifications = await this.getUserNotifications(userId);
      return notifications.filter((n) => !n.read);
    } catch (error) {
      this.logger.error(
        `Error fetching unread notifications: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * تحديث إخطار كمقروء
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const key = `notification:${notificationId}`;
      const notification = await this.cacheService.get<INotification>(
        key,
        'notifications',
      );

      if (!notification) {
        this.logger.warn(`Notification not found: ${notificationId}`);
        return;
      }

      if (notification.userId !== userId) {
        this.logger.warn(
          `User ${userId} trying to access notification of user ${notification.userId}`,
        );
        return;
      }

      notification.read = true;
      notification.readAt = new Date();

      // تحديث في الـ cache
      const ttl = notification.expiresAt
        ? Math.floor((notification.expiresAt.getTime() - Date.now()) / 1000)
        : this.DEFAULT_TTL;

      await this.cacheService.set(key, notification, {
        ttl,
        namespace: 'notifications',
      });

      // تقليل عداد الإخطارات غير المقروءة
      const unreadCountKey = `unread:${userId}`;
      await this.cacheService.decrement(unreadCountKey, 1, 'notifications');

      this.logger.log(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث جميع الإخطارات كمقروءة
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId);
      let updated = 0;

      for (const notification of notifications) {
        if (!notification.read) {
          await this.markAsRead(notification.id, userId);
          updated++;
        }
      }

      this.logger.log(
        `${updated} notifications marked as read for user ${userId}`,
      );
      return updated;
    } catch (error) {
      this.logger.error(
        `Error marking all notifications as read: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * حذف إخطار
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    try {
      const key = `notification:${notificationId}`;
      const notification = await this.cacheService.get<INotification>(
        key,
        'notifications',
      );

      if (!notification || notification.userId !== userId) {
        return;
      }

      await this.cacheService.del(key, 'notifications');

      // تقليل العداد إذا لم يكن مقروءاً
      if (!notification.read) {
        const unreadCountKey = `unread:${userId}`;
        await this.cacheService.decrement(unreadCountKey, 1, 'notifications');
      }

      this.logger.log(`Notification deleted: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * حذف جميع إخطارات المستخدم
   */
  async deleteAll(userId: string): Promise<number> {
    try {
      const key = `notifications:${userId}`;
      const count = await this.cacheService.del(key, 'notifications');

      // إعادة تعيين عداد الإخطارات غير المقروءة
      const unreadCountKey = `unread:${userId}`;
      await this.cacheService.del(unreadCountKey, 'notifications');

      this.logger.log(`All notifications deleted for user ${userId}`);
      return count;
    } catch (error) {
      this.logger.error(`Error deleting all notifications: ${error.message}`);
      return 0;
    }
  }

  /**
   * الحصول على إحصائيات الإخطارات
   */
  async getStats(userId: string): Promise<INotificationStats> {
    try {
      const notifications = await this.getUserNotifications(userId);
      const unreadKey = `unread:${userId}`;

      let unreadCount = 0;
      try {
        const ttl = await this.cacheService.getTTL(unreadKey, 'notifications');
        if (ttl > 0) {
          unreadCount =
            (await this.cacheService.get<number>(unreadKey, 'notifications')) ||
            0;
        }
      } catch (e) {
        unreadCount = notifications.filter((n) => !n.read).length;
      }

      const byType: Record<string, number> = {};
      for (const notification of notifications) {
        byType[notification.type] = (byType[notification.type] || 0) + 1;
      }

      return {
        total: notifications.length,
        unread: unreadCount,
        byType,
      };
    } catch (error) {
      this.logger.error(`Error getting notification stats: ${error.message}`);
      return {
        total: 0,
        unread: 0,
        byType: {},
      };
    }
  }

  /**
   * الحصول على عدد الإخطارات غير المقروءة
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const key = `unread:${userId}`;
      const count = await this.cacheService.get<number>(key, 'notifications');
      return count || 0;
    } catch (error) {
      this.logger.error(`Error getting unread count: ${error.message}`);
      return 0;
    }
  }

  /**
   * بث إخطار إلى جميع المستخدمين
   */
  async broadcast(
    notification: Omit<ICreateNotification, 'userId'>,
    userIds: string[],
  ): Promise<string[]> {
    try {
      const createdIds: string[] = [];

      for (const userId of userIds) {
        const created = await this.create({
          ...notification,
          userId,
        });
        createdIds.push(created.id);
      }

      this.logger.log(`Broadcast notification to ${userIds.length} users`);
      return createdIds;
    } catch (error) {
      this.logger.error(`Error broadcasting notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * دالة مساعدة لإنشاء معرف فريد للإخطار
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
