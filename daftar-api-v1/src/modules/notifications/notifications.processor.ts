// ============================================
// Notifications Processor — Bull Queue Worker
// ============================================
// Consumes jobs from the 'notifications' Bull queue.
// Each job carries a { notificationId } and this processor:
//   1. Loads the notification from DB
//   2. Loads the user's active device tokens
//   3. Calls PushService.send()
//   4. Marks notification as sent in DB
//
// Why separate processor vs calling PushService directly in the use-case?
//   - Push delivery is async and may be slow (network call to Expo API)
//   - Bull provides automatic retry with exponential backoff
//   - Failures don't block the API response — the DB record is already created
//   - Job history is kept in Redis for debugging
// ============================================

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { NotificationsRepository } from './notifications.repository';
import { PushService } from './push.service';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const SEND_PUSH_JOB = 'send-push';

export interface SendPushJobData {
  notificationId: string;
}

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly pushService: PushService,
  ) {}

  @Process(SEND_PUSH_JOB)
  async handleSendPush(job: Job<SendPushJobData>): Promise<void> {
    const { notificationId } = job.data;

    this.logger.debug(
      `Processing push job for notification: ${notificationId}`,
    );

    // ── Step 1: Load notification ────────────────────────────────────────
    const notification = await this.repo.findById(notificationId);
    if (!notification) {
      // Notification deleted between enqueue and processing — silently discard
      this.logger.warn(
        `Notification ${notificationId} not found — skipping push delivery`,
      );
      return;
    }

    // Skip if already sent (idempotency — handles Bull retry edge cases)
    if (notification.sentAt) {
      this.logger.debug(
        `Notification ${notificationId} already sent at ${notification.sentAt} — skipping`,
      );
      return;
    }

    // ── Step 2: Load active device tokens ───────────────────────────────
    const tokens = await this.repo.findActiveTokensByUserId(
      notification.userId,
    );
    if (tokens.length === 0) {
      // No tokens — still mark as "sent" so we don't retry forever
      this.logger.debug(
        `No active tokens for user ${notification.userId} — marking notification as sent without push`,
      );
      await this.repo.markSent(notificationId, new Date());
      return;
    }

    // ── Step 3: Send via Expo ────────────────────────────────────────────
    const result = await this.pushService.send({
      tokens,
      title: notification.title,
      body: notification.body,
      data: (notification.data as Record<string, unknown>) ?? {},
    });

    // Log but do NOT throw on push failures — push is best-effort
    if (result.failedTokens.length > 0) {
      this.logger.warn(
        `Push delivery partial failure for notification ${notificationId}: ` +
          `${result.failedTokens.length} token(s) failed`,
        { failedTokens: result.failedTokens },
      );
    }

    // ── Step 4: Mark notification as sent ───────────────────────────────
    await this.repo.markSent(notificationId, new Date());

    this.logger.log(
      `Push delivery complete for notification ${notificationId}: ` +
        `${result.successCount} device(s) reached`,
    );
  }
}
