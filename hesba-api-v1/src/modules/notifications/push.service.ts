// ============================================
// Push Service — Expo Push Notification Sender
// ============================================
// Handles actual delivery to devices via the Expo Push API.
// This service is intentionally thin — it only cares about:
//   1. Validating Expo tokens
//   2. Chunking messages (Expo rate-limit aware)
//   3. Sending to the Expo API
//   4. Logging failed deliveries for retry
//
// Design decisions:
//   - Uses expo-server-sdk which transparently handles both
//     FCM (Android) and APNs (iOS) — no vendor-specific config needed.
//   - Expo push tokens from the mobile app start with "ExponentPushToken[...]"
//   - Messages are chunked (max 100/chunk per Expo API limits).
//   - DeferredReceipts can be polled for delivery status (future improvement).
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

export interface PushPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

export interface PushResult {
  successCount: number;
  failedTokens: string[]; // tokens that received error tickets
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(private readonly config: ConfigService) {
    const accessToken = this.config.get<string>(
      'notification.expo.accessToken',
    );
    this.expo = new Expo({ accessToken });
  }

  /**
   * Send push notifications to one or more Expo tokens.
   *
   * Flow:
   *   1. Filter out invalid tokens (Expo.isExpoPushToken)
   *   2. Build ExpoPushMessage array
   *   3. Chunk into groups of ≤100 (Expo API limit)
   *   4. Send each chunk — non-blocking errors are logged, not thrown
   *   5. Return success/fail summary for caller to act on
   *
   * Why not throw on partial failure?
   *   Push notification delivery is best-effort — one revoked token
   *   should never prevent delivery to other valid tokens.
   */
  async send(payload: PushPayload): Promise<PushResult> {
    const {
      tokens,
      title,
      body,
      data = {},
      sound = 'default',
      badge,
    } = payload;

    // ── Step 1: Validate tokens ─────────────────────────────────────────
    const validTokens = tokens.filter((token) => {
      if (!Expo.isExpoPushToken(token)) {
        this.logger.warn(`Skipping invalid Expo push token: ${token}`);
        return false;
      }
      return true;
    });

    if (validTokens.length === 0) {
      return { successCount: 0, failedTokens: [] };
    }

    // ── Step 2: Build messages ───────────────────────────────────────────
    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      title,
      body,
      sound,
      data,
      ...(badge !== undefined && { badge }),
    }));

    // ── Step 3 & 4: Chunk and send ───────────────────────────────────────
    const chunks = this.expo.chunkPushNotifications(messages);
    const allTickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        allTickets.push(...tickets);
      } catch (error) {
        // Chunk-level error — log and continue with remaining chunks
        this.logger.error(
          `Failed to send push notification chunk: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    // ── Step 5: Analyze tickets ──────────────────────────────────────────
    const failedTokens: string[] = [];
    let successCount = 0;

    allTickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        successCount++;
      } else {
        // 'error' status — token may be invalid/revoked
        const failedToken = validTokens[index];
        this.logger.warn(
          `Push ticket error for token ${failedToken}: ${ticket.message}`,
          { details: ticket.details },
        );
        failedTokens.push(failedToken);
      }
    });

    this.logger.log(
      `Push sent: ${successCount}/${validTokens.length} succeeded, ` +
        `${failedTokens.length} failed`,
    );

    return { successCount, failedTokens };
  }
}
