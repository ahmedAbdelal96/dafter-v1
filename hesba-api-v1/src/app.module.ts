import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import * as fs from 'fs';

// Config
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import emailConfig from './config/email.config';
import bullConfig from './config/bull.config';
import notificationConfig from './config/notification.config';

// Infrastructure
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { CacheModule } from './common/cache/cache.module';
import { GuardsModule } from './common/guards/guards.module';
import { TranslationModule } from './common/services/translation.module';

// Entitlements — MUST come after DatabaseModule and CacheModule (both @Global)
import { EntitlementModule } from './common/entitlements/entitlement.module';

// App
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';

// Phase 2 — Sales & Installments
import { DeferredSalesModule } from './modules/deferred-sales/deferred-sales.module';
import { InstallmentsModule } from './modules/installments/installments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PlatformDashboardModule } from './modules/platform-dashboard/platform-dashboard.module';
import { PlatformAuditModule } from './modules/platform-audit/platform-audit.module';

// Phase 3 — Expenses
import { ExpensesModule } from './modules/expenses/expenses.module';

// Phase 4 — Products Catalog
import { ProductsModule } from './modules/products/products.module';

// Phase K — Invoices
import { InvoicesModule } from './modules/invoices/invoices.module';

// P2 — Pricing
import { PricingModule } from './modules/pricing/pricing.module';

// P2 — Statements
import { StatementsModule } from './modules/statements/statements.module';

// P3 — Audit
import { AuditModule } from './modules/audit/audit.module';

// Cash Reconciliation
import { CashReconciliationModule } from './modules/cash-reconciliation/cash-reconciliation.module';

@Module({
  imports: [
    // ── Configuration ──
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        jwtConfig,
        databaseConfig,
        redisConfig,
        emailConfig,
        bullConfig,
        notificationConfig,
      ],
      envFilePath: '.env',
    }),

    // ── Internationalisation ──
    I18nModule.forRoot({
      fallbackLanguage: 'ar',
      loaderOptions: {
        path: resolveI18nPath(),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        { use: HeaderResolver, options: ['Accept-Language'] },
        AcceptLanguageResolver,
      ],
    }),

    // ── Rate Limiting ──
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
          limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
        },
      ],
    }),

    // ── Bull Queue (Redis-backed for push notifications) ──
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
        },
      }),
    }),

    // ── Infrastructure (Global) ──
    DatabaseModule, // provides PrismaService + SubscriptionGovernanceService (@Global)
    LoggerModule,
    CacheModule, // provides CacheService (@Global)
    GuardsModule, // provides all guards + FeatureGuard (@Global)
    TranslationModule,
    EntitlementModule, // provides EntitlementService (@Global) — depends on Database + Cache

    // ── Feature Modules ──
    AuthModule,
    PlatformModule,
    CompaniesModule,
    UsersModule,
    CustomersModule,
    SuppliersModule,
    EmployeesModule,
    LedgerModule,
    NotificationsModule,
    EntitlementsModule, // GET /my/entitlements + GET /plans/feature-catalog

    // Phase 2 — Sales & Installments
    DeferredSalesModule,
    InstallmentsModule,
    ReportsModule,
    DashboardModule,
    PlatformDashboardModule,
    PlatformAuditModule,

    // Phase 3 — Expenses
    ExpensesModule,

    // Phase 4 — Products Catalog
    ProductsModule,

    // Phase K — Invoices
    InvoicesModule,

    // P2 — Pricing
    PricingModule,

    // P2 — Statements
    StatementsModule,

    // P3 — Audit
    AuditModule,

    // Cash Reconciliation
    CashReconciliationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

function resolveI18nPath(): string {
  // Build outputs can be either dist/main.js or dist/src/main.js depending on tsconfig.
  const candidates = [
    path.join(__dirname, 'i18n'),
    path.join(__dirname, '../i18n'),
    path.join(process.cwd(), 'src', 'i18n'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}
