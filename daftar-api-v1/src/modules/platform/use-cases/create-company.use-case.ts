// ============================================
// Use Case: Create Company (إنشاء شركة جديدة)
// ============================================
// Super Admin manually onboards a new company.
// Flow:
//  1. Validate owner email is unique
//  2. Validate plan exists and is active
//  3. Hash owner password
//  4. Atomic transaction: company + owner + subscription + audit log
// ============================================

import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PlatformRepository } from '../platform.repository';
import { CreateCompanyDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { PlatformSettingsService } from '../platform-settings.service';

@Injectable()
export class CreateCompanyUseCase {
  private readonly logger = new Logger(CreateCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly t: TranslationService,
  ) {}

  async execute(dto: CreateCompanyDto, actorUserId: string) {
    // Step 1: Check email uniqueness
    const emailTaken = await this.platformRepo.emailExists(dto.ownerEmail);
    if (emailTaken) {
      throw new ConflictException(
        this.t.translate('platform.companies.create.emailExists'),
      );
    }

    // Step 2: Validate plan exists and is active
    const plan = await this.platformRepo.findPlanById(dto.planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundException(
        this.t.translate('platform.companies.create.planNotFound'),
      );
    }

    const platformSettings = await this.platformSettingsService.getSettings();

    // Step 3: Resolve subscription duration contract.
    const now = new Date();
    const allowedTerms = new Set([1, 3, 6, 12]);

    let endDate: Date;
    let subscriptionStatus: SubscriptionStatus;
    let paymentStatus: PaymentStatus;

    if (dto.subscriptionEndDate) {
      endDate = new Date(dto.subscriptionEndDate);
      if (Number.isNaN(endDate.getTime()) || endDate <= now) {
        throw new BadRequestException(
          this.t.translate('platform.subscriptions.extend.invalidDate'),
        );
      }
      subscriptionStatus = SubscriptionStatus.ACTIVE;
      paymentStatus = PaymentStatus.PAID;
    } else if (dto.trialDays && dto.trialDays > 0) {
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + dto.trialDays);
      subscriptionStatus = SubscriptionStatus.TRIAL;
      paymentStatus = PaymentStatus.PENDING;
    } else {
      const defaultTermFromPlan = plan.billingCycle === 'YEARLY' ? 12 : 1;
      const termMonths = dto.termMonths ?? defaultTermFromPlan;

      if (!allowedTerms.has(termMonths)) {
        throw new BadRequestException(
          'termMonths must be one of: 1, 3, 6, 12',
        );
      }

      // If selected plan is free/trial-like and no paid term was explicitly selected,
      // fall back to platform trial default for fast onboarding.
      if (plan.price.toNumber() === 0 && dto.termMonths == null) {
        const trialDays = platformSettings.trialDefaults.durationDays;
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() + trialDays);
        subscriptionStatus = SubscriptionStatus.TRIAL;
        paymentStatus = PaymentStatus.PENDING;
      } else {
        endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + termMonths);
        subscriptionStatus = SubscriptionStatus.ACTIVE;
        paymentStatus = PaymentStatus.PAID;
      }
    }

    // Step 4: Hash password (cost factor 12)
    const SALT_ROUNDS = 12;
    const ownerPasswordHash = await bcrypt.hash(dto.ownerPassword, SALT_ROUNDS);

    // Step 5: Atomic transaction
    let result;
    try {
      result = await this.platformRepo.createCompanyWithOwner({
        companyName: dto.companyName,
        companyPhone: dto.companyPhone,
        companyAddress: dto.companyAddress,
        currencyCode: dto.currencyCode,
        ownerFullName: dto.ownerFullName,
        ownerEmail: dto.ownerEmail,
        ownerPasswordHash,
        ownerPhone: dto.ownerPhone,
        planId: dto.planId,
        subscriptionEndDate: endDate,
        subscriptionStatus,
        paymentStatus,
        autoRenew: dto.autoRenew ?? false,
        actorUserId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create company: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.companies.create.failed'),
      );
    }

    return {
      company: {
        id: result.company.id,
        name: result.company.name,
        phone: result.company.phone,
        address: result.company.address,
        currencyCode: result.company.currencyCode,
        isActive: result.company.isActive,
        createdAt: result.company.createdAt,
      },
      owner: {
        id: result.owner.id,
        fullName: result.owner.fullName,
        email: result.owner.email,
        phone: result.owner.phone,
        role: result.owner.role,
      },
      subscription: {
        id: result.subscription.id,
        planId: result.subscription.planId,
        status: result.subscription.status,
        startDate: result.subscription.startDate,
        endDate: result.subscription.endDate,
        autoRenew: result.subscription.autoRenew,
      },
    };
  }
}
