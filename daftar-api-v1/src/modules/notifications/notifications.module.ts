// ============================================
// Notifications Module — Wiring & Dependencies
// ============================================
// Integrates Expo push notifications with NestJS Bull queue.
//
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//   push.send() → notifQueue → NotificationsProcessor → PushService → Expo API
//
// Exported:
//   NotificationsService — so other modules can call .send(options)
//   NotificationsRepository — for auth module to call .deactivateAllUserTokens()
// ============================================

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

// Processor queue name constant
import { NOTIFICATIONS_QUEUE } from './notifications.processor';

// Controller & Service
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// Infrastructure
import { NotificationsRepository } from './notifications.repository';
import { PushService } from './push.service';
import { NotificationsProcessor } from './notifications.processor';

// Use Cases
import {
  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
  ListNotificationsUseCase,
  GetUnreadCountUseCase,
  MarkReadUseCase,
  MarkAllReadUseCase,
} from './use-cases';

@Module({
  imports: [
    // Register the notifications Bull queue
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    // Service layer
    NotificationsService,

    // Data access
    NotificationsRepository,

    // Push delivery
    PushService,
    NotificationsProcessor,

    // Use cases
    RegisterDeviceTokenUseCase,
    UnregisterDeviceTokenUseCase,
    ListNotificationsUseCase,
    GetUnreadCountUseCase,
    MarkReadUseCase,
    MarkAllReadUseCase,
  ],
  // Export so Auth module can deactivateAllUserTokens on logout-all
  // and other feature modules can call .send()
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
