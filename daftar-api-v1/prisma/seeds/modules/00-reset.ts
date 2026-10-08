import { SeedContext } from '../types';

export const resetDatabase = async (ctx: SeedContext): Promise<void> => {
  await ctx.prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "InvoiceItem",
      "Invoice",
      "Product",
      "Expense",
      "InstallmentPayment",
      "InstallmentSchedule",
      "InstallmentContract",
      "DeferredPayment",
      "DeferredSale",
      "Notification",
      "DeviceToken",
      "AuditLog",
      "Balance",
      "LedgerEntry",
      "Customer",
      "Supplier",
      "Employee",
      "SubscriptionPayment",
      "CompanySubscription",
      "Plan",
      "StaffPermission",
      "RefreshToken",
      "PasswordResetToken",
      "User",
      "Company"
    RESTART IDENTITY CASCADE;
  `);
};
