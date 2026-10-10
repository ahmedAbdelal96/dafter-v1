// ============================================
// Daftar - Re-export Prisma Enums + App Enums
// ============================================

export {
  UserRole,
  UserStatus,
  SubscriptionStatus,
  PaymentStatus,
  BillingCycle,
} from '@prisma/client';

/**
 * Supported languages for i18n
 */
export enum Language {
  AR = 'ar',
  EN = 'en',
}

/**
 * Sort direction for listing queries
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
