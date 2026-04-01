// ============================================
// Platform Service — Orchestration Layer
// ============================================
// Delegates to Use Cases. Each public method corresponds to
// one API endpoint. No business logic lives here.
// ============================================

import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
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
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  ArchiveCompanyDto,
  DeleteCompanyDto,
  CompanyQueryDto,
  CreatePlanDto,
  UpdatePlanDto,
  ActivateSubscriptionDto,
  SuspendSubscriptionDto,
  ExtendSubscriptionDto,
  ChangePlanDto,
  PlatformUserQueryDto,
  PlatformCreateStaffDto,
  PlatformUpdateUserDto,
  PlatformUpdatePermissionsDto,
  PlatformResetUserCredentialsDto,
  UpdatePlatformSettingsDto,
  CreatePlatformFeatureFlagDto,
  UpdatePlatformFeatureFlagDto,
} from './dto';
import { PlatformSettingsService } from './platform-settings.service';
import {
  PLATFORM_IDEMPOTENCY_OPERATIONS,
  PLATFORM_IDEMPOTENCY_SCOPE,
  PlatformIdempotencyService,
} from './idempotency';

@Injectable()
export class PlatformService {
  constructor(
    // Companies
    private readonly createCompanyUC: CreateCompanyUseCase,
    private readonly updateCompanyUC: UpdateCompanyUseCase,
    private readonly disableCompanyUC: DisableCompanyUseCase,
    private readonly enableCompanyUC: EnableCompanyUseCase,
    private readonly archiveCompanyUC: ArchiveCompanyUseCase,
    private readonly restoreCompanyUC: RestoreCompanyUseCase,
    private readonly deleteCompanyUC: DeleteCompanyUseCase,
    private readonly listCompaniesUC: ListCompaniesUseCase,
    private readonly getCompanyUC: GetCompanyUseCase,
    private readonly getCompanyMetricsUC: GetCompanyMetricsUseCase,
    // Plans
    private readonly createPlanUC: CreatePlanUseCase,
    private readonly listPlansUC: ListPlansUseCase,
    private readonly updatePlanUC: UpdatePlanUseCase,
    // Subscriptions
    private readonly activateSubscriptionUC: ActivateSubscriptionUseCase,
    private readonly suspendSubscriptionUC: SuspendSubscriptionUseCase,
    private readonly extendSubscriptionUC: ExtendSubscriptionUseCase,
    private readonly changePlanUC: ChangePlanUseCase,
    private readonly idempotencyService: PlatformIdempotencyService,
    private readonly usersService: UsersService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  // ── Companies ───────────────────────────────

  createCompany(dto: CreateCompanyDto, actorUserId: string) {
    return this.createCompanyUC.execute(dto, actorUserId);
  }

  updateCompany(companyId: string, dto: UpdateCompanyDto, actorUserId: string) {
    return this.updateCompanyUC.execute(companyId, dto, actorUserId);
  }

  disableCompany(companyId: string, actorUserId: string) {
    return this.disableCompanyUC.execute(companyId, actorUserId);
  }

  enableCompany(companyId: string, actorUserId: string) {
    return this.enableCompanyUC.execute(companyId, actorUserId);
  }

  archiveCompany(
    companyId: string,
    dto: ArchiveCompanyDto,
    actorUserId: string,
  ) {
    return this.archiveCompanyUC.execute(companyId, dto, actorUserId);
  }

  restoreCompany(
    companyId: string,
    dto: ArchiveCompanyDto,
    actorUserId: string,
  ) {
    return this.restoreCompanyUC.execute(companyId, dto, actorUserId);
  }

  deleteCompany(companyId: string, dto: DeleteCompanyDto, actorUserId: string) {
    return this.deleteCompanyUC.execute(companyId, dto, actorUserId);
  }

  listCompanies(query: CompanyQueryDto) {
    return this.listCompaniesUC.execute(query);
  }

  getCompany(companyId: string) {
    return this.getCompanyUC.execute(companyId);
  }

  getCompanyMetrics(companyId: string) {
    return this.getCompanyMetricsUC.execute(companyId);
  }

  // ── Plans ────────────────────────────────────

  createPlan(dto: CreatePlanDto) {
    return this.createPlanUC.execute(dto);
  }

  listPlans(includeInactive: boolean) {
    return this.listPlansUC.execute(includeInactive);
  }

  updatePlan(planId: string, dto: UpdatePlanDto) {
    return this.updatePlanUC.execute(planId, dto);
  }

  // ── Subscriptions ────────────────────────────

  activateSubscription(
    dto: ActivateSubscriptionDto,
    actorUserId: string,
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.executeMutation({
      scope: PLATFORM_IDEMPOTENCY_SCOPE,
      operationType: PLATFORM_IDEMPOTENCY_OPERATIONS.ACTIVATE_SUBSCRIPTION,
      actorUserId,
      companyId: dto.companyId,
      idempotencyKey,
      payload: {
        companyId: dto.companyId,
        planId: dto.planId,
        endDate: dto.endDate,
        autoRenew: dto.autoRenew ?? false,
        note: dto.note ?? null,
      },
      run: () => this.activateSubscriptionUC.execute(dto, actorUserId),
    });
  }

  suspendSubscription(
    dto: SuspendSubscriptionDto,
    actorUserId: string,
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.executeMutation({
      scope: PLATFORM_IDEMPOTENCY_SCOPE,
      operationType: PLATFORM_IDEMPOTENCY_OPERATIONS.SUSPEND_SUBSCRIPTION,
      actorUserId,
      companyId: dto.companyId,
      idempotencyKey,
      payload: {
        companyId: dto.companyId,
        reason: dto.reason ?? null,
      },
      run: () => this.suspendSubscriptionUC.execute(dto, actorUserId),
    });
  }

  extendSubscription(
    dto: ExtendSubscriptionDto,
    actorUserId: string,
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.executeMutation({
      scope: PLATFORM_IDEMPOTENCY_SCOPE,
      operationType: PLATFORM_IDEMPOTENCY_OPERATIONS.EXTEND_SUBSCRIPTION,
      actorUserId,
      companyId: dto.companyId,
      idempotencyKey,
      payload: {
        companyId: dto.companyId,
        newEndDate: dto.newEndDate,
        reason: dto.reason ?? null,
      },
      run: () => this.extendSubscriptionUC.execute(dto, actorUserId),
    });
  }

  changePlan(dto: ChangePlanDto, actorUserId: string, idempotencyKey?: string) {
    return this.idempotencyService.executeMutation({
      scope: PLATFORM_IDEMPOTENCY_SCOPE,
      operationType: PLATFORM_IDEMPOTENCY_OPERATIONS.CHANGE_PLAN,
      actorUserId,
      companyId: dto.companyId,
      idempotencyKey,
      payload: {
        companyId: dto.companyId,
        newPlanId: dto.newPlanId,
        mode: dto.mode ?? 'IMMEDIATE',
        reason: dto.reason ?? null,
      },
      run: () => this.changePlanUC.execute(dto, actorUserId),
    });
  }

  // -- Platform Users -------------------------------------------------------

  async createStaff(dto: PlatformCreateStaffDto, actorUserId: string) {
    return this.usersService.createStaff(dto.companyId, actorUserId, dto);
  }

  async listUsers(query: PlatformUserQueryDto) {
    return this.usersService.listUsers(query.companyId, query);
  }

  async getUser(companyId: string, userId: string) {
    return this.usersService.getUser(companyId, userId);
  }

  async updateUser(
    userId: string,
    dto: PlatformUpdateUserDto,
    actorUserId: string,
  ) {
    return this.usersService.updateUser(dto.companyId, userId, dto, actorUserId);
  }

  async updatePermissions(
    userId: string,
    dto: PlatformUpdatePermissionsDto,
    actorUserId: string,
  ) {
    return this.usersService.updatePermissions(
      dto.companyId,
      userId,
      dto,
      actorUserId,
    );
  }

  async disableUser(companyId: string, userId: string, actorUserId: string) {
    return this.usersService.disableUser(companyId, userId, actorUserId);
  }

  async enableUser(companyId: string, userId: string, actorUserId: string) {
    return this.usersService.enableUser(companyId, userId, actorUserId);
  }

  async getUsersStats(companyId: string) {
    return this.usersService.getStats(companyId);
  }

  async resetUserCredentials(
    userId: string,
    dto: PlatformResetUserCredentialsDto,
    actorUserId: string,
  ) {
    return this.usersService.resetCredentials(
      dto.companyId,
      userId,
      actorUserId,
      dto,
    );
  }

  // -- Platform Settings ----------------------------------------------------

  getSettings() {
    return this.platformSettingsService.getSettings();
  }

  updateSettings(dto: UpdatePlatformSettingsDto) {
    return this.platformSettingsService.updateSettings(dto);
  }

  getFeatureFlags() {
    return this.platformSettingsService.getFeatureFlags();
  }

  createFeatureFlag(dto: CreatePlatformFeatureFlagDto) {
    return this.platformSettingsService.createFeatureFlag(dto);
  }

  updateFeatureFlag(name: string, dto: UpdatePlatformFeatureFlagDto) {
    return this.platformSettingsService.updateFeatureFlag(name, dto);
  }

  getCapabilities() {
    const canHardDeleteCompany =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_COMPANY_HARD_DELETE === 'true';

    return {
      canHardDeleteCompany,
    };
  }
}
