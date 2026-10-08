// ============================================
// Auth Repository — Database Layer
// ============================================
// Encapsulates ALL Prisma queries for the Auth module.
// No business logic here — just data access.
// ============================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  UserRole,
  UserStatus,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // USER QUERIES
  // ─────────────────────────────────────────────

  /**
   * Find user by email (for login)
   * Includes company + permissions for JWT payload building
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        company: {
          select: { id: true, name: true, isActive: true, isDeleted: true },
        },
        permissions: true,
      },
    });
  }

  /**
   * Find user by ID (for profile / token refresh)
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: { id: true, name: true, isActive: true, isDeleted: true },
        },
        permissions: true,
      },
    });
  }

  /**
   * Update user's failed login attempts counter
   */
  async updateLoginAttempts(
    userId: string,
    data: { failedAttempts: number; lockedUntil: Date | null },
  ) {
    // We store these in metadata since User model doesn't have these fields.
    // For now, we use a simple approach: store in a JSON or add fields.
    // Since schema doesn't have failedAttempts, we'll handle it in-memory via Redis cache.
    // This method is a placeholder — actual lockout is implemented via CacheService.
  }

  /**
   * Update user password hash
   */
  async updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Update user's display name and/or phone number (self-service profile update)
   * Email is intentionally excluded — changing it requires re-verification.
   */
  async updateUserProfile(
    userId: string,
    data: { fullName?: string; phone?: string | null },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  }

  // ─────────────────────────────────────────────
  // REFRESH TOKEN QUERIES
  // ─────────────────────────────────────────────

  /**
   * Create a new refresh token entry
   */
  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ip: data.ip,
      },
    });
  }

  /**
   * Find a refresh token by its hash (for token rotation)
   */
  async findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            company: {
              select: { id: true, name: true, isActive: true, isDeleted: true },
            },
          },
        },
      },
    });
  }

  /**
   * Revoke a specific refresh token (logout single device)
   */
  async revokeRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke ALL refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Clean up expired tokens (maintenance job, called periodically)
   */
  async deleteExpiredTokens() {
    return this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * List active sessions for a user (non-revoked, non-expired)
   * Returns only safe metadata — tokenHash is NEVER exposed.
   */
  async findActiveSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
        // tokenHash intentionally excluded — security sensitive
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────
  // REGISTRATION (ATOMIC TRANSACTION)
  // ─────────────────────────────────────────────

  /**
   * Register a new company + owner user + trial subscription
   * All in a single atomic transaction — if any step fails, everything rolls back.
   *
   * Steps:
   *  1. Find or create the "Free Trial" plan
   *  2. Create the Company
   *  3. Create the Owner User (linked to company)
   *  4. Create the CompanySubscription (TRIAL status)
   */
  async registerCompanyWithOwner(data: {
    // User data
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    // Company data
    companyName: string;
    companyPhone?: string;
    companyAddress?: string;
    // Trial config
    trialDays: number;
    autoActivateOnSignup: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Find or create the Free Trial plan
      // This ensures the system always has a trial plan available
      let trialPlan = await tx.plan.findFirst({
        where: { name: 'FREE_TRIAL', isActive: true },
      });

      if (!trialPlan) {
        trialPlan = await tx.plan.create({
          data: {
            name: 'FREE_TRIAL',
            price: 0,
            currencyCode: 'EGP',
            billingCycle: 'MONTHLY',
            // Generous limits for trial — enough to evaluate the system
            maxUsers: 3,
            maxCustomers: 50,
            maxSuppliers: 20,
            maxEmployees: 10,
            maxLedgerEntries: 500,
            features: JSON.stringify(['trial']),
            isActive: true,
          },
        });
      }

      // Step 2: Create the Company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          phone: data.companyPhone,
          address: data.companyAddress,
          currencyCode: 'EGP',
          isActive: true,
        },
      });

      // Step 3: Create the Owner User (linked to the company)
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          companyId: company.id,
        },
      });

      // Step 4: Create trial subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + data.trialDays);

      const subscription = await tx.companySubscription.create({
        data: {
          companyId: company.id,
          planId: trialPlan.id,
          status: data.autoActivateOnSignup
            ? SubscriptionStatus.TRIAL
            : SubscriptionStatus.DISABLED,
          startDate: now,
          endDate,
          autoRenew: false,
          paymentStatus: 'PENDING',
        },
      });

      // Step 5: Create audit log for the registration
      await tx.auditLog.create({
        data: {
          companyId: company.id,
          actorUserId: user.id,
          action: 'auth.register',
          entityType: 'company',
          entityId: company.id,
          metadata: {
            companyName: company.name,
            ownerEmail: user.email,
            trialEndsAt: endDate.toISOString(),
            autoActivateOnSignup: data.autoActivateOnSignup,
          },
        },
      });

      return { user, company, subscription, trialPlan };
    });
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase().trim() },
    });
    return count > 0;
  }

  // ─────────────────────────────────────────────
  // PASSWORD RESET TOKENS
  // ─────────────────────────────────────────────

  /**
   * Find user by email OR phone for password reset
   */
  async findUserByIdentifier(identifier: string) {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      return this.prisma.user.findUnique({
        where: { email: identifier.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          phone: true,
          status: true,
          fullName: true,
        },
      });
    }
    // Phone lookup (exact match after normalization)
    return this.prisma.user.findFirst({
      where: { phone: identifier },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        fullName: true,
      },
    });
  }

  /**
   * Delete all previous reset tokens for a user, then create a new one.
   * Single-use, single-active-token per user.
   */
  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    channel: string;
    expiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Clean up old tokens (prevent accumulation)
      await tx.passwordResetToken.deleteMany({
        where: { userId: data.userId },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          channel: data.channel,
          expiresAt: data.expiresAt,
        },
      });
    });
  }

  /**
   * Find a valid (unused, unexpired) reset token by hash
   */
  async findValidResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, email: true, phone: true, status: true } },
      },
    });
  }

  /**
   * Mark reset token as used + update user password in one transaction
   */
  async consumeResetToken(
    tokenId: string,
    userId: string,
    newPasswordHash: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      });

      // Update password
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke ALL refresh tokens (all devices kicked out for security)
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          // Password reset can happen even without a company context:
          // We use a dummy companyId from the user if available
          companyId:
            (
              await tx.user.findUnique({
                where: { id: userId },
                select: { companyId: true },
              })
            )?.companyId ?? userId, // fallback — should always have companyId
          actorUserId: userId,
          action: 'auth.password_reset',
          entityType: 'user',
          entityId: userId,
          metadata: { tokenId },
        },
      });
    });
  }
}
