import { Module, Global } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
// import { NotificationDbService } from './notification-db.service'; // Legacy - disabled

/**
 * Notification Module - Global Module
 *
 * يوفر:
 * - إدارة الإخطارات للمستخدمين (Redis + Database)
 * - تخزين الإخطارات في Redis و PostgreSQL
 * - تتبع الإخطارات المقروءة/غير المقروءة
 * - Broadcasting الفوري عبر WebSocket
 * - REST API للإخطارات
 */
@Global()
@Module({
  imports: [CacheModule, PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
