// ============================================
// Notifications Repository — Database Layer
// ============================================
// Pure data access — no business logic.
// All notification queries are user-scoped.
//
// Design: DeviceTokens are upserted (never duplicated), and
// deactivated on unregister rather than hard-deleted (audit trail).
// ============================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateNotificationData {
  userId: string;
  companyId?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════
  // DEVICE TOKENS
  // ══════════════════════════════════════════════

  /**
   * Upsert a device token — if the same Expo token was previously
   * registered (even by the same user after re-install), we reactivate it
   * and update its metadata rather than creating a duplicate.
   */
  async upsertDeviceToken(data: {
    userId: string;
    token: string;
    platform: string;
    deviceName?: string;
  }) {
    return this.prisma.deviceToken.upsert({
      where: { token: data.token },
      create: {
        userId: data.userId,
        token: data.token,
        platform: data.platform,
        deviceName: data.deviceName,
        isActive: true,
      },
      update: {
        // Re-link to current user (token might have been used on a different account)
        userId: data.userId,
        platform: data.platform,
        deviceName: data.deviceName,
        isActive: true,
      },
    });
  }

  /**
   * Deactivate a specific token (on logout / user explicitly removes device).
   * Soft-disables rather than deleting — preserves history and avoids
   * re-registration edge cases.
   */
  async deactivateToken(token: string, userId: string) {
    // Only deactivate if the token belongs to this user (security check)
    return this.prisma.deviceToken.updateMany({
      where: { token, userId },
      data: { isActive: false },
    });
  }

  /**
   * Deactivate ALL tokens for a user (used on logout-all / password reset)
   */
  async deactivateAllUserTokens(userId: string) {
    return this.prisma.deviceToken.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  /**
   * Get all active Expo push tokens for a user.
   * Used by PushService to send push to all user's devices.
   */
  async findActiveTokensByUserId(userId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  }

  // ══════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════

  /**
   * Create a new notification record.
   * This is always called before push delivery is queued.
   */
  async createNotification(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: (data.data ?? {}) as any,
      },
    });
  }

  /**
   * Paginated notification feed for a user, newest first.
   * Results always exclude other users' notifications (user-scoped).
   */
  async findByUser(
    userId: string,
    params: {
      page: number;
      limit: number;
      onlyUnread?: boolean;
    },
  ) {
    const { page, limit, onlyUnread = false } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(onlyUnread && { readAt: null }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          readAt: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Count unread notifications for a user (for badge indicator)
   */
  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  /**
   * Mark a single notification as read.
   * Returns null if notification doesn't belong to the user (security guard).
   */
  async markOneRead(id: string, userId: string) {
    // Verify ownership before updating
    const exists = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true, readAt: true },
    });

    if (!exists) return null;
    if (exists.readAt) return exists; // Already read — idempotent

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Mark ALL unread notifications for a user as read in one query.
   * Returns the count of records updated.
   */
  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  /**
   * Update a notification's sentAt field after successful push delivery.
   * Called by the Bull processor after Expo confirms delivery.
   */
  async markSent(id: string, sentAt: Date) {
    return this.prisma.notification.update({
      where: { id },
      data: { sentAt },
    });
  }

  /**
   * Fetch a notification by ID (used by push processor to load full data)
   */
  async findById(id: string) {
    return this.prisma.notification.findUnique({ where: { id } });
  }
}
