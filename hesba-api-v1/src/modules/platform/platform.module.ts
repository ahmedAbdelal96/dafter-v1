// ============================================
// Platform Module — Wiring & Dependencies
// ============================================
// Registers all Platform providers for Super Admin management.
//
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//
// Guard strategy: @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
// — applied per route in controller (not module-level).
// ============================================

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FeatureFlagsService } from '../../common/feature-flags/feature-flags.service';
import { PlatformIdempotencyModule } from './idempotency';

// Controller & Service
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformSettingsService } from './platform-settings.service';

// Repository
import { PlatformRepository } from './platform.repository';

// Use Cases
import {
  CreateCompanyUseCase,
  UpdateCompanyUseCase,
  DisableCompanyUseCase,
  EnableCompanyUseCase,
  ArchiveCompanyUseCase,
  RestoreCompanyUseCase,
  DeleteCompanyUseCase,
  ListCompaniesUseCase,
  GetCompanyUseCase,
  GetCompanyMetricsUseCase,
  CreatePlanUseCase,
  ListPlansUseCase,
  UpdatePlanUseCase,
  ActivateSubscriptionUseCase,
  SuspendSubscriptionUseCase,
  ExtendSubscriptionUseCase,
  ChangePlanUseCase,
} from './use-cases';

@Module({
  imports: [UsersModule, PlatformIdempotencyModule],
  controllers: [PlatformController],
  providers: [
    // Service layer
    PlatformService,
    PlatformSettingsService,
    FeatureFlagsService,

    // Data access
    PlatformRepository,

    // Use cases — Companies
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    DisableCompanyUseCase,
    EnableCompanyUseCase,
    ArchiveCompanyUseCase,
    RestoreCompanyUseCase,
    DeleteCompanyUseCase,
    ListCompaniesUseCase,
    GetCompanyUseCase,
    GetCompanyMetricsUseCase,

    // Use cases — Plans
    CreatePlanUseCase,
    ListPlansUseCase,
    UpdatePlanUseCase,

    // Use cases — Subscriptions
    ActivateSubscriptionUseCase,
    SuspendSubscriptionUseCase,
    ExtendSubscriptionUseCase,
    ChangePlanUseCase,
  ],
  exports: [PlatformSettingsService],
})
export class PlatformModule {}
