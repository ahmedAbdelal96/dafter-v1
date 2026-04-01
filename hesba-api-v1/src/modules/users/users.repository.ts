// ============================================
// Users Repository — Database Layer
// ============================================
// Pure data access — no business logic.
// All queries are company-scoped (multi-tenant isolation).
//
// AuditLog actions used here:
//   'users.create-staff'       — إنشاء Staff
//   'users.update'             — تعديل بيانات
//   'users.disable'            — تعطيل حساب
//   'users.enable'             — إعادة تفعيل حساب
//   'users.update-permissions' — تعديل صلاحيات
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import { StaffPermissionsMap } from '../../common/types';

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  // ══════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════

  /**
   * إنشاء Staff مع تهيئة StaffPermission — atomic transaction
   *
   * Design: Both User + StaffPermission created in one transaction.
   * If either fails, both are rolled back.
   */
  async createStaff(data: {
    companyId: string;
    fullName: string;
    email: string;
    passwordHash: string;
    phone?: string;
    permissions: StaffPermissionsMap;
    actorUserId: string;
  }, tx?: Prisma.TransactionClient) {
    const write = async (db: Prisma.TransactionClient) => {
      const user = await db.user.create({
        data: {
          companyId: data.companyId,
          fullName: data.fullName,
          email: data.email.toLowerCase().trim(),
          passwordHash: data.passwordHash,
          phone: data.phone,
          role: UserRole.STAFF,
          status: UserStatus.ACTIVE,
        },
      });

      // Store permissions as JSON — no columns to add for future permissions
      const permissions = await db.staffPermission.create({
        data: {
          userId: user.id,
          permissions: data.permissions as Prisma.InputJsonValue,
        },
      });

      await db.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'users.create-staff',
          entityType: 'user',
          entityId: user.id,
          metadata: {
            email: user.email,
            fullName: user.fullName,
            permissions: data.permissions,
          },
        },
      });

      return { ...user, permissions };
    };

    if (tx) return write(tx);
    return this.prisma.$transaction((innerTx) => write(innerTx));
  }

  // ══════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════

  /**
   * جلب مستخدم واحد بالـ ID (company-scoped)
   * يجلب معه StaffPermission لو كان Staff
   */
  async findById(companyId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, companyId, isDeleted: false },
      include: { permissions: true },
    });
  }

  /**
   * جلب مستخدم بالبريد الإلكتروني (company-scoped)
   */
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        isDeleted: false,
      },
    });
  }

  /**
   * جلب قائمة المستخدمين مع pagination + search + status filter
   *
   * Performance: count + data in parallel using $transaction
   */
  async findMany(
    companyId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: UserStatus;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const {
      page,
      limit,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      companyId,
      isDeleted: false,
      ...(status && { status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { permissions: true },
        // Don't return passwordHash in list views
        omit: { passwordHash: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  /**
   * عدد المستخدمين الفعليين في الشركة (للتحقق من plan limit)
   * يحسب فقط المستخدمين الـ ACTIVE غير المحذوفين
   */
  async countActiveUsers(companyId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        companyId,
        isDeleted: false,
        status: UserStatus.ACTIVE,
      },
    });
  }

  /**
   * عدد الـ OWNER في الشركة (للتحقق قبل تعطيل آخر Owner)
   */
  async countActiveOwners(companyId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        companyId,
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      },
    });
  }

  /**
   * إحصائيات سريعة للمستخدمين (للـ stats endpoint)
   */
  async getStats(companyId: string) {
    const [total, active, disabled, staff, owners] =
      await this.prisma.$transaction([
        this.prisma.user.count({
          where: { companyId, isDeleted: false },
        }),
        this.prisma.user.count({
          where: { companyId, isDeleted: false, status: UserStatus.ACTIVE },
        }),
        this.prisma.user.count({
          where: { companyId, isDeleted: false, status: UserStatus.DISABLED },
        }),
        this.prisma.user.count({
          where: {
            companyId,
            isDeleted: false,
            role: UserRole.STAFF,
          },
        }),
        this.prisma.user.count({
          where: {
            companyId,
            isDeleted: false,
            role: UserRole.OWNER,
          },
        }),
      ]);

    return { total, active, disabled, staff, owners };
  }

  // ══════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════

  /**
   * تعديل البيانات الأساسية للمستخدم (اسم + هاتف)
   */
  async updateUser(
    companyId: string,
    userId: string,
    data: { fullName?: string; phone?: string },
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.phone !== undefined && { phone: data.phone }),
        },
        include: { permissions: true },
        omit: { passwordHash: true },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'users.update',
          entityType: 'user',
          entityId: userId,
          metadata: { changes: data },
        },
      });

      return updated;
    });
  }

  /**
   * تعديل صلاحيات Staff (upsert — ينشئ لو مش موجود)
   */
  async updatePermissions(
    companyId: string,
    userId: string,
    newPermissions: StaffPermissionsMap,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Merge with existing permissions (partial update — only sent keys change)
      const existing = await tx.staffPermission.findUnique({
        where: { userId },
        select: { permissions: true },
      });

      const currentPerms = (existing?.permissions ?? {}) as StaffPermissionsMap;
      const merged: StaffPermissionsMap = {
        ...currentPerms,
        ...newPermissions,
      };

      const updated = await tx.staffPermission.upsert({
        where: { userId },
        create: {
          userId,
          permissions: merged as Prisma.InputJsonValue,
        },
        update: {
          permissions: merged as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'users.update-permissions',
          entityType: 'user',
          entityId: userId,
          metadata: { before: currentPerms, after: merged },
        },
      });

      return updated;
    });
  }

  /**
   * تعطيل حساب Staff (soft disable — لا يُحذف)
   */
  async disableUser(companyId: string, userId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.DISABLED },
        omit: { passwordHash: true },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'users.disable',
          entityType: 'user',
          entityId: userId,
          metadata: { disabledBy: actorUserId },
        },
      });

      return updated;
    });
  }

  /**
   * إعادة تفعيل حساب Staff المعطل (soft enable)
   */
  async enableUser(companyId: string, userId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
        omit: { passwordHash: true },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'users.enable',
          entityType: 'user',
          entityId: userId,
          metadata: { enabledBy: actorUserId },
        },
      });

      return updated;
    });
  }

  // ══════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════

  /**
   * التحقق من وجود بريد إلكتروني مسجل بالفعل (system-wide)
   */
  async logCredentialsReset(data: {
    companyId: string;
    actorUserId: string;
    targetUserId: string;
    channel: 'email' | 'whatsapp';
    reason?: string;
    expiresAt: Date;
  }) {
    return this.prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        actorUserId: data.actorUserId,
        action: 'users.reset-credentials',
        entityType: 'user',
        entityId: data.targetUserId,
        metadata: {
          channel: data.channel,
          reason: data.reason ?? null,
          expiresAt: data.expiresAt.toISOString(),
        },
      },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase().trim() },
    });
    return count > 0;
  }

  /**
   * جلب الـ maxUsers من خطة الشركة الحالية
   */
  async getCompanyUserLimit(companyId: string): Promise<number | null> {
    const subscription =
      await this.subscriptionGovernance.findEntitledSubscriptionPlanLimits(
        companyId,
      );

    return subscription?.plan?.maxUsers ?? null;
  }
}
