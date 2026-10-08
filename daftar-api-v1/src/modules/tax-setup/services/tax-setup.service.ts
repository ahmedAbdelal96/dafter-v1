import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, TaxCalculationMode, TaxLifecycleStatus, TaxModuleKey } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { TaxAuditService } from './tax-audit.service';
import { TaxSetupPolicyService } from './tax-setup-policy.service';
import { buildListMeta, normalizeTaxCode, toNullableString } from './tax-setup.utils';
import {
  CreateTaxRateDto,
  CreateTaxRegistrationProfileDto,
  CreateTaxTreatmentDto,
  TaxRateSearchQueryDto,
  TaxSetupQueryDto,
  UpdateTaxAccountBindingDto,
  UpdateTaxDefaultPolicyDto,
  UpdateTaxModuleApplicabilityRuleDto,
  UpdateTaxRateDto,
  UpdateTaxRegistrationProfileDto,
  UpdateTaxTreatmentDto,
} from '../dto/tax-setup.dto';
import {
  TaxAccountBindingView,
  TaxDefaultPolicyView,
  TaxListResponse,
  TaxModuleApplicabilityRuleView,
  TaxRateView,
  TaxRegistrationProfileView,
  TaxTreatmentView,
} from '../types/tax-setup.types';
import { TaxDbClient } from './tax-setup-policy.service';

function requireCompanyId(companyId?: string | null): string {
  if (!companyId) {
    throw new ForbiddenException('tax_setup.company_context_required');
  }
  return companyId;
}

@Injectable()
export class TaxSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: TaxSetupPolicyService,
    private readonly audit: TaxAuditService,
  ) {}

  async getRegistrationProfile(companyId?: string | null): Promise<TaxRegistrationProfileView> {
    const company = requireCompanyId(companyId);
    return this.policy.toProfileView(await this.policy.ensureRegistrationProfile(company));
  }

  async updateRegistrationProfile(
    companyId: string | null | undefined,
    actorUserId: string,
    dto: UpdateTaxRegistrationProfileDto,
  ): Promise<TaxRegistrationProfileView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.taxRegistrationProfile.upsert({
        where: { companyId: company },
        create: this.buildRegistrationProfileCreate(company, dto),
        update: this.buildRegistrationProfileUpdate(dto),
      });

      await this.audit.log(tx, {
        companyId: company,
        actorUserId,
        action: 'tax_setup.registration_profile.updated',
        entityType: 'tax_registration_profile',
        entityId: profile.id,
      });

      const refreshed = await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toProfileView(refreshed);
    });
  }

  async listTaxRates(companyId: string | null | undefined, query: TaxRateSearchQueryDto): Promise<TaxListResponse<TaxRateView>> {
    const company = requireCompanyId(companyId);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const search = query.search?.trim();
    const activeOnly = query.activeOnly ?? false;
    const includeArchived = query.includeArchived ?? false;

    const where: Prisma.TaxRateWhereInput = {
      companyId: company,
      ...(activeOnly && { status: TaxLifecycleStatus.ACTIVE }),
      ...(!includeArchived && !activeOnly && { status: { not: TaxLifecycleStatus.ARCHIVED } }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { normalizedCode: { contains: normalizeTaxCode(search), mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { treatment: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.taxRate.findMany({
        where,
        include: { treatment: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxRate.count({ where }),
    ]);

    return {
      items: items.map((rate) => this.policy.toRateView(rate)),
      meta: buildListMeta(total, page, limit),
    };
  }

  async getTaxRate(companyId: string | null | undefined, taxRateId: string): Promise<TaxRateView> {
    const company = requireCompanyId(companyId);
    return this.policy.toRateView(await this.policy.getTaxRateOrThrow(company, taxRateId));
  }

  async createTaxRate(companyId: string | null | undefined, actorUserId: string, dto: CreateTaxRateDto): Promise<TaxRateView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const normalizedCode = await this.policy.assertUniqueRateCode(company, dto.code, undefined, tx);
      const treatment = dto.treatmentId ? await this.policy.getTaxTreatmentOrThrow(company, dto.treatmentId, tx) : null;

      const rate = await tx.taxRate.create({
        data: {
          companyId: company,
          code: dto.code.trim(),
          normalizedCode,
          name: dto.name.trim(),
          percentage: new Prisma.Decimal(dto.percentage),
          treatmentId: dto.treatmentId ?? null,
          status: dto.status ?? TaxLifecycleStatus.ACTIVE,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          description: toNullableString(dto.description)?.trim() || null,
          isDefault: dto.isDefault ?? false,
        },
        include: { treatment: true },
      });

      if (rate.isDefault) {
        await tx.taxRate.updateMany({ where: { companyId: company, id: { not: rate.id } }, data: { isDefault: false } });
      }

      await this.audit.log(tx, {
        companyId: company,
        actorUserId,
        action: 'tax_setup.rate.created',
        entityType: 'tax_rate',
        entityId: rate.id,
      });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toRateView({ ...rate, treatment });
    });
  }

  async updateTaxRate(companyId: string | null | undefined, actorUserId: string, taxRateId: string, dto: UpdateTaxRateDto): Promise<TaxRateView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.policy.getTaxRateOrThrow(company, taxRateId, tx);
      if (current.status !== TaxLifecycleStatus.ACTIVE) {
        throw new BadRequestException('tax_setup.rate_locked');
      }

      const normalizedCode = dto.code ? await this.policy.assertUniqueRateCode(company, dto.code, taxRateId, tx) : current.normalizedCode;
      const treatment = dto.treatmentId ? await this.policy.getTaxTreatmentOrThrow(company, dto.treatmentId, tx) : current.treatment;

      const rate = await tx.taxRate.update({
        where: { id: taxRateId },
        data: {
          ...(dto.code && { code: dto.code.trim(), normalizedCode }),
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.percentage !== undefined && { percentage: new Prisma.Decimal(dto.percentage) }),
          ...(dto.treatmentId !== undefined && { treatmentId: dto.treatmentId || null }),
          ...(dto.effectiveFrom !== undefined && { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null }),
          ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
          ...(dto.description !== undefined && { description: toNullableString(dto.description)?.trim() || null }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        },
        include: { treatment: true },
      });

      if (rate.isDefault) {
        await tx.taxRate.updateMany({ where: { companyId: company, id: { not: rate.id } }, data: { isDefault: false } });
      }

      await this.audit.log(tx, {
        companyId: company,
        actorUserId,
        action: 'tax_setup.rate.updated',
        entityType: 'tax_rate',
        entityId: rate.id,
      });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toRateView({ ...rate, treatment });
    });
  }

  async inactivateTaxRate(companyId: string | null | undefined, actorUserId: string, taxRateId: string): Promise<TaxRateView> {
    return this.setTaxRateStatus(companyId, actorUserId, taxRateId, TaxLifecycleStatus.INACTIVE, 'tax_setup.rate.inactivated');
  }

  async archiveTaxRate(companyId: string | null | undefined, actorUserId: string, taxRateId: string): Promise<TaxRateView> {
    return this.setTaxRateStatus(companyId, actorUserId, taxRateId, TaxLifecycleStatus.ARCHIVED, 'tax_setup.rate.archived');
  }

  private async setTaxRateStatus(
    companyId: string | null | undefined,
    actorUserId: string,
    taxRateId: string,
    status: TaxLifecycleStatus,
    action: string,
  ): Promise<TaxRateView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.policy.getTaxRateOrThrow(company, taxRateId, tx);
      if (current.status === status) {
        return this.policy.toRateView(current);
      }

      const rate = await tx.taxRate.update({ where: { id: taxRateId }, data: { status, isDefault: false }, include: { treatment: true } });
      const defaultPolicy = await tx.taxDefaultPolicy.findUnique({ where: { companyId: company } });
      if (defaultPolicy?.defaultRateId === rate.id) {
        await tx.taxDefaultPolicy.update({ where: { companyId: company }, data: { defaultRateId: null } });
      }

      await this.audit.log(tx, { companyId: company, actorUserId, action, entityType: 'tax_rate', entityId: rate.id });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toRateView(rate);
    });
  }

  async listTaxTreatments(companyId: string | null | undefined, query: TaxSetupQueryDto): Promise<TaxListResponse<TaxTreatmentView>> {
    const company = requireCompanyId(companyId);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const search = query.search?.trim();
    const activeOnly = query.activeOnly ?? false;
    const includeArchived = query.includeArchived ?? false;

    const where: Prisma.TaxTreatmentWhereInput = {
      companyId: company,
      ...(activeOnly && { status: TaxLifecycleStatus.ACTIVE }),
      ...(!includeArchived && !activeOnly && { status: { not: TaxLifecycleStatus.ARCHIVED } }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { normalizedCode: { contains: normalizeTaxCode(search), mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.taxTreatment.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxTreatment.count({ where }),
    ]);

    return {
      items: items.map((treatment) => this.policy.toTreatmentView(treatment)),
      meta: buildListMeta(total, page, limit),
    };
  }

  async getTaxTreatment(companyId: string | null | undefined, treatmentId: string): Promise<TaxTreatmentView> {
    const company = requireCompanyId(companyId);
    return this.policy.toTreatmentView(await this.policy.getTaxTreatmentOrThrow(company, treatmentId));
  }

  async createTaxTreatment(companyId: string | null | undefined, actorUserId: string, dto: CreateTaxTreatmentDto): Promise<TaxTreatmentView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const normalizedCode = await this.policy.assertUniqueTreatmentCode(company, dto.code, undefined, tx);
      const treatment = await tx.taxTreatment.create({
        data: {
          companyId: company,
          code: dto.code.trim(),
          normalizedCode,
          name: dto.name.trim(),
          category: dto.category,
          calculationMode: dto.calculationMode ?? TaxCalculationMode.TAX_EXCLUSIVE,
          description: toNullableString(dto.description)?.trim() || null,
          isDefault: dto.isDefault ?? false,
          status: dto.status ?? TaxLifecycleStatus.ACTIVE,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });

      if (treatment.isDefault) {
        await tx.taxTreatment.updateMany({ where: { companyId: company, id: { not: treatment.id } }, data: { isDefault: false } });
      }

      await this.audit.log(tx, {
        companyId: company,
        actorUserId,
        action: 'tax_setup.treatment.created',
        entityType: 'tax_treatment',
        entityId: treatment.id,
      });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toTreatmentView(treatment);
    });
  }

  async updateTaxTreatment(companyId: string | null | undefined, actorUserId: string, treatmentId: string, dto: UpdateTaxTreatmentDto): Promise<TaxTreatmentView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.policy.getTaxTreatmentOrThrow(company, treatmentId, tx);
      if (current.status !== TaxLifecycleStatus.ACTIVE) {
        throw new BadRequestException('tax_setup.treatment_locked');
      }

      const normalizedCode = dto.code ? await this.policy.assertUniqueTreatmentCode(company, dto.code, treatmentId, tx) : current.normalizedCode;

      const treatment = await tx.taxTreatment.update({
        where: { id: treatmentId },
        data: {
          ...(dto.code && { code: dto.code.trim(), normalizedCode }),
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.category && { category: dto.category }),
          ...(dto.calculationMode && { calculationMode: dto.calculationMode }),
          ...(dto.description !== undefined && { description: toNullableString(dto.description)?.trim() || null }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.effectiveFrom !== undefined && { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null }),
          ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
        },
      });

      if (treatment.isDefault) {
        await tx.taxTreatment.updateMany({ where: { companyId: company, id: { not: treatment.id } }, data: { isDefault: false } });
      }

      await this.audit.log(tx, {
        companyId: company,
        actorUserId,
        action: 'tax_setup.treatment.updated',
        entityType: 'tax_treatment',
        entityId: treatment.id,
      });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toTreatmentView(treatment);
    });
  }

  async inactivateTaxTreatment(companyId: string | null | undefined, actorUserId: string, treatmentId: string): Promise<TaxTreatmentView> {
    return this.setTaxTreatmentStatus(companyId, actorUserId, treatmentId, TaxLifecycleStatus.INACTIVE, 'tax_setup.treatment.inactivated');
  }

  async archiveTaxTreatment(companyId: string | null | undefined, actorUserId: string, treatmentId: string): Promise<TaxTreatmentView> {
    return this.setTaxTreatmentStatus(companyId, actorUserId, treatmentId, TaxLifecycleStatus.ARCHIVED, 'tax_setup.treatment.archived');
  }

  private async setTaxTreatmentStatus(
    companyId: string | null | undefined,
    actorUserId: string,
    treatmentId: string,
    status: TaxLifecycleStatus,
    action: string,
  ): Promise<TaxTreatmentView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.policy.getTaxTreatmentOrThrow(company, treatmentId, tx);
      if (current.status === status) {
        return this.policy.toTreatmentView(current);
      }

      const treatment = await tx.taxTreatment.update({ where: { id: treatmentId }, data: { status, isDefault: false } });
      const defaultPolicy = await tx.taxDefaultPolicy.findUnique({ where: { companyId: company } });
      if (defaultPolicy?.defaultTreatmentId === treatment.id) {
        await tx.taxDefaultPolicy.update({ where: { companyId: company }, data: { defaultTreatmentId: null } });
      }

      await this.audit.log(tx, { companyId: company, actorUserId, action, entityType: 'tax_treatment', entityId: treatment.id });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toTreatmentView(treatment);
    });
  }

  async getDefaultPolicy(companyId: string | null | undefined): Promise<TaxDefaultPolicyView> {
    const company = requireCompanyId(companyId);
    const policy = await this.policy.ensureDefaultPolicy(company);
    const rate = policy.defaultRateId ? await this.prisma.taxRate.findUnique({ where: { id: policy.defaultRateId } }) : null;
    const treatment = policy.defaultTreatmentId ? await this.prisma.taxTreatment.findUnique({ where: { id: policy.defaultTreatmentId } }) : null;
    return this.policy.toDefaultPolicyView(policy, rate?.name ?? null, treatment?.name ?? null);
  }

  async updateDefaultPolicy(companyId: string | null | undefined, actorUserId: string, dto: UpdateTaxDefaultPolicyDto): Promise<TaxDefaultPolicyView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const rate = dto.defaultRateId ? await this.policy.getTaxRateOrThrow(company, dto.defaultRateId, tx) : null;
      const treatment = dto.defaultTreatmentId ? await this.policy.getTaxTreatmentOrThrow(company, dto.defaultTreatmentId, tx) : null;
      const policy = await tx.taxDefaultPolicy.upsert({
        where: { companyId: company },
        create: {
          companyId: company,
          defaultCalculationMode: dto.defaultCalculationMode ?? TaxCalculationMode.TAX_EXCLUSIVE,
          defaultRateId: dto.defaultRateId ?? null,
          defaultTreatmentId: dto.defaultTreatmentId ?? null,
          allowManualOverride: dto.allowManualOverride ?? true,
          notes: toNullableString(dto.notes)?.trim() || null,
        },
        update: {
          ...(dto.defaultCalculationMode && { defaultCalculationMode: dto.defaultCalculationMode }),
          ...(dto.defaultRateId !== undefined && { defaultRateId: dto.defaultRateId }),
          ...(dto.defaultTreatmentId !== undefined && { defaultTreatmentId: dto.defaultTreatmentId }),
          ...(dto.allowManualOverride !== undefined && { allowManualOverride: dto.allowManualOverride }),
          ...(dto.notes !== undefined && { notes: toNullableString(dto.notes)?.trim() || null }),
        },
      });
      await this.audit.log(tx, { companyId: company, actorUserId, action: 'tax_setup.default_policy.updated', entityType: 'tax_default_policy', entityId: policy.id });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toDefaultPolicyView(policy, rate?.name ?? null, treatment?.name ?? null);
    });
  }

  async getAccountBinding(companyId: string | null | undefined): Promise<TaxAccountBindingView> {
    const company = requireCompanyId(companyId);
    return this.policy.toAccountBindingView(await this.policy.ensureAccountBinding(company));
  }

  async updateAccountBinding(companyId: string | null | undefined, actorUserId: string, dto: UpdateTaxAccountBindingDto): Promise<TaxAccountBindingView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const binding = await tx.taxAccountBinding.upsert({
        where: { companyId: company },
        create: {
          companyId: company,
          taxPayableAccountCode: toNullableString(dto.taxPayableAccountCode)?.trim() || null,
          recoverableTaxAccountCode: toNullableString(dto.recoverableTaxAccountCode)?.trim() || null,
          outputTaxAccountCode: toNullableString(dto.outputTaxAccountCode)?.trim() || null,
          inputTaxAccountCode: toNullableString(dto.inputTaxAccountCode)?.trim() || null,
          roundingAccountCode: toNullableString(dto.roundingAccountCode)?.trim() || null,
          notes: toNullableString(dto.notes)?.trim() || null,
        },
        update: {
          ...(dto.taxPayableAccountCode !== undefined && { taxPayableAccountCode: toNullableString(dto.taxPayableAccountCode)?.trim() || null }),
          ...(dto.recoverableTaxAccountCode !== undefined && { recoverableTaxAccountCode: toNullableString(dto.recoverableTaxAccountCode)?.trim() || null }),
          ...(dto.outputTaxAccountCode !== undefined && { outputTaxAccountCode: toNullableString(dto.outputTaxAccountCode)?.trim() || null }),
          ...(dto.inputTaxAccountCode !== undefined && { inputTaxAccountCode: toNullableString(dto.inputTaxAccountCode)?.trim() || null }),
          ...(dto.roundingAccountCode !== undefined && { roundingAccountCode: toNullableString(dto.roundingAccountCode)?.trim() || null }),
          ...(dto.notes !== undefined && { notes: toNullableString(dto.notes)?.trim() || null }),
        },
      });
      await this.audit.log(tx, { companyId: company, actorUserId, action: 'tax_setup.account_binding.updated', entityType: 'tax_account_binding', entityId: binding.id });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toAccountBindingView(binding);
    });
  }

  async listApplicabilityRules(companyId: string | null | undefined): Promise<TaxListResponse<TaxModuleApplicabilityRuleView>> {
    const company = requireCompanyId(companyId);
    await this.policy.ensureApplicabilityRules(company);
    const rules = await this.prisma.taxModuleApplicabilityRule.findMany({
      where: { companyId: company },
      orderBy: { moduleKey: 'asc' },
      include: { defaultRate: true, defaultTreatment: true },
    });

    return {
      items: rules.map((rule) => this.policy.toApplicabilityRuleView(rule, rule.defaultRate?.name ?? null, rule.defaultTreatment?.name ?? null)),
      meta: buildListMeta(rules.length, 1, Math.max(rules.length, 1)),
    };
  }

  async updateApplicabilityRule(companyId: string | null | undefined, actorUserId: string, moduleKey: TaxModuleKey, dto: UpdateTaxModuleApplicabilityRuleDto): Promise<TaxModuleApplicabilityRuleView> {
    const company = requireCompanyId(companyId);
    return this.prisma.$transaction(async (tx) => {
      const rate = dto.defaultRateId ? await this.policy.getTaxRateOrThrow(company, dto.defaultRateId, tx) : null;
      const treatment = dto.defaultTreatmentId ? await this.policy.getTaxTreatmentOrThrow(company, dto.defaultTreatmentId, tx) : null;
      const rule = await tx.taxModuleApplicabilityRule.upsert({
        where: { companyId_moduleKey: { companyId: company, moduleKey } },
        create: {
          companyId: company,
          moduleKey,
          isEnabled: dto.isEnabled ?? true,
          allowOverride: dto.allowOverride ?? true,
          defaultRateId: dto.defaultRateId ?? null,
          defaultTreatmentId: dto.defaultTreatmentId ?? null,
          notes: toNullableString(dto.notes)?.trim() || null,
        },
        update: {
          ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
          ...(dto.allowOverride !== undefined && { allowOverride: dto.allowOverride }),
          ...(dto.defaultRateId !== undefined && { defaultRateId: dto.defaultRateId }),
          ...(dto.defaultTreatmentId !== undefined && { defaultTreatmentId: dto.defaultTreatmentId }),
          ...(dto.notes !== undefined && { notes: toNullableString(dto.notes)?.trim() || null }),
        },
        include: { defaultRate: true, defaultTreatment: true },
      });
      await this.audit.log(tx, { companyId: company, actorUserId, action: 'tax_setup.applicability_rule.updated', entityType: 'tax_applicability_rule', entityId: rule.id });
      await this.policy.refreshProfileReadiness(company, tx);
      return this.policy.toApplicabilityRuleView(rule, rate?.name ?? null, treatment?.name ?? null);
    });
  }

  private buildRegistrationProfileCreate(
    companyId: string,
    dto: CreateTaxRegistrationProfileDto | UpdateTaxRegistrationProfileDto,
  ) {
    return {
      companyId,
      countryCode: dto.countryCode?.trim().toUpperCase() || 'EG',
      regimeCode: toNullableString(dto.regimeCode)?.trim() || null,
      vatRegistrationStatus: dto.vatRegistrationStatus ?? 'NOT_REGISTERED',
      vatRegistrationNumber: toNullableString(dto.vatRegistrationNumber)?.trim() || null,
      legalTaxName: toNullableString(dto.legalTaxName)?.trim() || null,
      registrationEffectiveDate: dto.registrationEffectiveDate ? new Date(dto.registrationEffectiveDate) : null,
      taxAddressLine1: toNullableString(dto.taxAddressLine1)?.trim() || null,
      taxAddressLine2: toNullableString(dto.taxAddressLine2)?.trim() || null,
      city: toNullableString(dto.city)?.trim() || null,
      region: toNullableString(dto.region)?.trim() || null,
      postalCode: toNullableString(dto.postalCode)?.trim() || null,
      readinessStatus: dto.readinessStatus ?? 'NOT_CONFIGURED',
      notes: toNullableString(dto.notes)?.trim() || null,
    };
  }

  private buildRegistrationProfileUpdate(dto: UpdateTaxRegistrationProfileDto) {
    return {
      ...(dto.countryCode && { countryCode: dto.countryCode.trim().toUpperCase() }),
      ...(dto.regimeCode !== undefined && { regimeCode: toNullableString(dto.regimeCode)?.trim() || null }),
      ...(dto.vatRegistrationStatus && { vatRegistrationStatus: dto.vatRegistrationStatus }),
      ...(dto.vatRegistrationNumber !== undefined && { vatRegistrationNumber: toNullableString(dto.vatRegistrationNumber)?.trim() || null }),
      ...(dto.legalTaxName !== undefined && { legalTaxName: toNullableString(dto.legalTaxName)?.trim() || null }),
      ...(dto.registrationEffectiveDate !== undefined && { registrationEffectiveDate: dto.registrationEffectiveDate ? new Date(dto.registrationEffectiveDate) : null }),
      ...(dto.taxAddressLine1 !== undefined && { taxAddressLine1: toNullableString(dto.taxAddressLine1)?.trim() || null }),
      ...(dto.taxAddressLine2 !== undefined && { taxAddressLine2: toNullableString(dto.taxAddressLine2)?.trim() || null }),
      ...(dto.city !== undefined && { city: toNullableString(dto.city)?.trim() || null }),
      ...(dto.region !== undefined && { region: toNullableString(dto.region)?.trim() || null }),
      ...(dto.postalCode !== undefined && { postalCode: toNullableString(dto.postalCode)?.trim() || null }),
      ...(dto.readinessStatus && { readinessStatus: dto.readinessStatus }),
      ...(dto.notes !== undefined && { notes: toNullableString(dto.notes)?.trim() || null }),
    };
  }
}
