import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { SentryModule } from './common/sentry/sentry.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';

// Entitlements â€” MUST come after DatabaseModule and CacheModule (both @Global)
import { EntitlementModule } from './common/entitlements/entitlement.module';

// App
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';

// Phase 2 â€” Sales & Installments
import { PlatformDashboardModule } from './modules/platform-dashboard/platform-dashboard.module';
import { PlatformAuditModule } from './modules/platform-audit/platform-audit.module';

// Phase 3 â€” Expenses
import { ExpensesModule } from './modules/expenses/expenses.module';

// Phase 4 â€” Products Catalog
import { ProductsModule } from './modules/products/products.module';

// Phase K â€” Invoices
import { SalesModule } from './modules/sales/sales.module';

// P2 â€” Pricing

// P2 â€” Statements

// P3 â€” Audit
import { AuditModule } from './modules/audit/audit.module';

// Cash Reconciliation
import { CashReconciliationModule } from './modules/cash-reconciliation/cash-reconciliation.module';
import { TaxSetupModule } from './modules/tax-setup/tax-setup.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { BusinessPartnersModule } from './modules/business-partners/business-partners.module';
import { PaymentTermsModule } from './modules/payment-terms/payment-terms.module';
import { AccountingBootstrapModule } from './modules/accounting-bootstrap/accounting-bootstrap.module';
import { OpeningBalancesModule } from './modules/opening-balances/opening-balances.module';

@Module({
  imports: [
    // â”€â”€ Configuration â”€â”€
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

    // â”€â”€ Internationalisation â”€â”€
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

    // â”€â”€ Rate Limiting â”€â”€
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
          limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
        },
      ],
    }),

    // â”€â”€ Bull Queue (Redis-backed for push notifications) â”€â”€
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

    // â”€â”€ Infrastructure (Global) â”€â”€
    DatabaseModule, // provides PrismaService + SubscriptionGovernanceService (@Global)
    LoggerModule,
    CacheModule, // provides CacheService (@Global)
    GuardsModule, // provides all guards + FeatureGuard (@Global)
    TranslationModule,
    SentryModule,
    EntitlementModule, // provides EntitlementService (@Global) â€” depends on Database + Cache

    // â”€â”€ Feature Modules â”€â”€
    AuthModule,
    PlatformModule,
    CompaniesModule,
    UsersModule,
    NotificationsModule,
    EntitlementsModule, // GET /my/entitlements + GET /plans/feature-catalog

    // Phase 2 â€” Sales & Installments
    PlatformDashboardModule,
    PlatformAuditModule,

    // Phase 3 â€” Expenses
    ExpensesModule,

    // Phase 4 â€” Products Catalog
    ProductsModule,

    // Phase K â€” Invoices
    SalesModule,

    // P2 â€” Pricing

    // P2 â€” Statements

    // P3 â€” Audit
    AuditModule,

    // Cash Reconciliation
    CashReconciliationModule,
    TaxSetupModule,
    AccountingModule,
    BusinessPartnersModule,
    PaymentTermsModule,
    AccountingBootstrapModule,
    OpeningBalancesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessResponseInterceptor,
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
