import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  NotificationService,
  INotification,
  INotificationStats,
} from './notification.service';

@Controller('notifications')
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * الحصول على إخطارات المستخدم
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'الحصول على إخطارات المستخدم',
    description: 'استرجاع جميع الإخطارات الخاصة بالمستخدم',
  })
  async getNotifications(
    @CurrentUser() userId: string,
    @Query('limit') limit?: number,
  ): Promise<INotification[]> {
    return this.notificationService.getUserNotifications(userId, limit || 50);
  }

  /**
   * الحصول على الإخطارات غير المقروءة
   */
  @Get('unread')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'الحصول على الإخطارات غير المقروءة',
    description: 'استرجاع الإخطارات التي لم يقرأها المستخدم بعد',
  })
  async getUnreadNotifications(
    @CurrentUser() userId: string,
  ): Promise<INotification[]> {
    return this.notificationService.getUnreadNotifications(userId);
  }

  /**
   * الحصول على إحصائيات الإخطارات
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'إحصائيات الإخطارات',
    description: 'الحصول على إحصائيات الإخطارات الخاصة بالمستخدم',
  })
  async getStats(@CurrentUser() userId: string): Promise<INotificationStats> {
    return this.notificationService.getStats(userId);
  }

  /**
   * الحصول على عدد الإخطارات غير المقروءة
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'عدد الإخطارات غير المقروءة',
    description: 'الحصول على عدد الإخطارات غير المقروءة',
  })
  async getUnreadCount(
    @CurrentUser() userId: string,
  ): Promise<{ unread: number }> {
    const unread = await this.notificationService.getUnreadCount(userId);
    return { unread };
  }

  /**
   * تحديث إخطار كمقروء
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تحديث إخطار كمقروء',
    description: 'وضع علامة على الإخطار كمقروء',
  })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() userId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.markAsRead(notificationId, userId);
    return { message: 'تم تحديث الإخطار بنجاح' };
  }

  /**
   * تحديث جميع الإخطارات كمقروءة
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تحديث جميع الإخطارات كمقروءة',
    description: 'وضع علامة على جميع الإخطارات كمقروءة',
  })
  async markAllAsRead(
    @CurrentUser() userId: string,
  ): Promise<{ updated: number }> {
    const updated = await this.notificationService.markAllAsRead(userId);
    return { updated };
  }

  /**
   * حذف إخطار
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'حذف إخطار',
    description: 'حذف إخطار محدد',
  })
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser() userId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.delete(notificationId, userId);
    return { message: 'تم حذف الإخطار بنجاح' };
  }

  /**
   * حذف جميع الإخطارات
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'حذف جميع الإخطارات',
    description: 'حذف جميع إخطارات المستخدم',
  })
  async deleteAllNotifications(
    @CurrentUser() userId: string,
  ): Promise<{ deleted: number }> {
    const deleted = await this.notificationService.deleteAll(userId);
    return { deleted };
  }
}
