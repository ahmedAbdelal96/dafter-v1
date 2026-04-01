// ============================================
// Notifications Service — Facade & Orchestration
// ============================================
// This is the public API of the notifications module.
//
// Other modules (Ledger, Auth, etc.) should inject this service
// and call .send() to create an in-app notification + queue push delivery.
//
// HTTP endpoint logic is delegated to use-cases,
// then thin methods here wire them up.
// ============================================

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
  ListNotificationsUseCase,
  ListNotificationsQuery,
  GetUnreadCountUseCase,
  MarkReadUseCase,
  MarkAllReadUseCase,
} from './use-cases';
import {
  NotificationsRepository,
  CreateNotificationData,
} from './notifications.repository';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import {
  NOTIFICATIONS_QUEUE,
  SEND_PUSH_JOB,
  SendPushJobData,
} from './notifications.processor';

// ─── Send options used by other modules ─────────────────────────────────────
export interface SendNotificationOptions {
  userId: string;
  companyId?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly registerUC: RegisterDeviceTokenUseCase,
    private readonly unregisterUC: UnregisterDeviceTokenUseCase,
    private readonly listUC: ListNotificationsUseCase,
    private readonly unreadCountUC: GetUnreadCountUseCase,
    private readonly markReadUC: MarkReadUseCase,
    private readonly markAllReadUC: MarkAllReadUseCase,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notifQueue: Queue,
  ) {}

  // ══════════════════════════════════════════════
  // PUBLIC — called by other modules
  // ══════════════════════════════════════════════

  /**
   * Create a notification DB record and enqueue a push delivery job.
   *
   * Usage from any other module:
   *   constructor(private readonly notifs: NotificationsService) {}
   *   await this.notifs.send({ userId, type: 'ledger.created', title: '...', body: '...' });
   */
  async send(options: SendNotificationOptions): Promise<void> {
    // 1. Persist to DB first (notification is visible in feed immediately)
    const notification = await this.repo.createNotification(
      options as CreateNotificationData,
    );

    // 2. Enqueue push job — async, non-blocking, retried on failure
    await this.notifQueue.add(
      SEND_PUSH_JOB,
      { notificationId: notification.id } satisfies SendPushJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for inspection
      },
    );
  }

  // ══════════════════════════════════════════════
  // DEVICE TOKENS
  // ══════════════════════════════════════════════

  registerToken(userId: string, dto: RegisterDeviceTokenDto) {
    return this.registerUC.execute(userId, dto);
  }

  unregisterToken(userId: string, token: string) {
    return this.unregisterUC.execute(userId, token);
  }

  /** Called on logout / password reset to deregister all user tokens */
  async deactivateAllTokens(userId: string) {
    return this.repo.deactivateAllUserTokens(userId);
  }

  // ══════════════════════════════════════════════
  // NOTIFICATION FEED
  // ══════════════════════════════════════════════

  listNotifications(userId: string, query: ListNotificationsQuery) {
    return this.listUC.execute(userId, query);
  }

  getUnreadCount(userId: string) {
    return this.unreadCountUC.execute(userId);
  }

  markRead(userId: string, notificationId: string) {
    return this.markReadUC.execute(userId, notificationId);
  }

  markAllRead(userId: string) {
    return this.markAllReadUC.execute(userId);
  }
}
