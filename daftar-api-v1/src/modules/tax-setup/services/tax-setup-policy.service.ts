import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxModuleKey } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  computeTaxSetupReadiness,
  decimalToString,
  normalizeTaxCode,
} from './tax-setup.utils';
import {
  TaxAccountBindingView,
  TaxDefaultPolicyView,
  TaxModuleApplicabilityRuleView,
  TaxRateView,
  TaxRegistrationProfileView,
  TaxTreatmentView,
} from '../types/tax-setup.types';

export type TaxDbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TaxSetupPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  private db(db?: TaxDbClient): TaxDbClient {
    return db ?? this.prisma;
  }

  async ensureRegistrationProfile(companyId: string, db?: TaxDbClient) {
    return this.db(db).taxRegistrationProfile.upsert({
      where: { companyId },
      create: {
        companyId,
        countryCode: 'EG',
        vatRegistrationStatus: 'NOT_REGISTERED',
        readinessStatus: 'NOT_CONFIGURED',
      },
      update: {},
    });
  }

  async ensureDefaultPolicy(companyId: string, db?: TaxDbClient) {
    return this.db(db).taxDefaultPolicy.upsert({
      where: { companyId },
      create: {
        companyId,
        defaultCalculationMode: 'TAX_EXCLUSIVE',
        allowManualOverride: true,
      },
      update: {},
    });
  }

  async ensureAccountBinding(companyId: string, db?: TaxDbClient) {
    return this.db(db).taxAccountBinding.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
  }

  async ensureApplicabilityRules(companyId: string, db?: TaxDbClient) {
    const client = this.db(db);
    const rules = [] as any[];
    for (const moduleKey of Object.values(TaxModuleKey)) {
      rules.push(
        await client.taxModuleApplicabilityRule.upsert({
          where: { companyId_moduleKey: { companyId, moduleKey } },
          create: { companyId, moduleKey, isEnabled: true, allowOverride: true },
          update: {},
        }),
      );
    }
    return rules;
  }

  async getTaxRateOrThrow(companyId: string, taxRateId: string, db?: TaxDbClient) {
    const rate = await this.db(db).taxRate.findFirst({
      where: { id: taxRateId, companyId },
      include: { treatment: true },
    });
    if (!rate) throw new NotFoundException('tax_setup.rate_not_found');
    return rate;
  }

  async getTaxTreatmentOrThrow(companyId: string, treatmentId: string, db?: TaxDbClient) {
    const treatment = await this.db(db).taxTreatment.findFirst({
      where: { id: treatmentId, companyId },
    });
    if (!treatment) throw new NotFoundException('tax_setup.treatment_not_found');
    return treatment;
  }

  async assertUniqueRateCode(companyId: string, code: string, excludeId?: string, db?: TaxDbClient) {
    const normalizedCode = normalizeTaxCode(code);
    const existing = await this.db(db).taxRate.findFirst({
      where: {
        companyId,
        normalizedCode,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new Error('tax_setup.rate_code_exists');
    return normalizedCode;
  }

  async assertUniqueTreatmentCode(companyId: string, code: string, excludeId?: string, db?: TaxDbClient) {
    const normalizedCode = normalizeTaxCode(code);
    const existing = await this.db(db).taxTreatment.findFirst({
      where: {
        companyId,
        normalizedCode,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new Error('tax_setup.treatment_code_exists');
    return normalizedCode;
  }

  async refreshProfileReadiness(companyId: string, db?: TaxDbClient) {
    const client = this.db(db);
    const [profile, ratesCount, treatmentsCount, policy, binding] = await Promise.all([
      this.ensureRegistrationProfile(companyId, client),
      client.taxRate.count({ where: { companyId, status: { in: ['ACTIVE', 'INACTIVE'] } } }),
      client.taxTreatment.count({ where: { companyId, status: { in: ['ACTIVE', 'INACTIVE'] } } }),
      client.taxDefaultPolicy.findUnique({ where: { companyId } }),
      client.taxAccountBinding.findUnique({ where: { companyId } }),
    ]);

    const readinessStatus = computeTaxSetupReadiness({
      hasProfile: Boolean(profile),
      hasTaxRates: ratesCount > 0,
      hasTaxTreatments: treatmentsCount > 0,
      hasDefaultPolicy: Boolean(policy),
      hasAccountBinding: Boolean(binding),
    });

    return client.taxRegistrationProfile.update({
      where: { companyId },
      data: { readinessStatus },
    });
  }

  toProfileView(profile: any): TaxRegistrationProfileView {
    return {
      id: profile.id,
      companyId: profile.companyId,
      countryCode: profile.countryCode,
      regimeCode: profile.regimeCode ?? null,
      vatRegistrationStatus: profile.vatRegistrationStatus,
      vatRegistrationNumber: profile.vatRegistrationNumber ?? null,
      legalTaxName: profile.legalTaxName ?? null,
      registrationEffectiveDate: profile.registrationEffectiveDate?.toISOString() ?? null,
      taxAddressLine1: profile.taxAddressLine1 ?? null,
      taxAddressLine2: profile.taxAddressLine2 ?? null,
      city: profile.city ?? null,
      region: profile.region ?? null,
      postalCode: profile.postalCode ?? null,
      readinessStatus: profile.readinessStatus,
      notes: profile.notes ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  toRateView(rate: any): TaxRateView {
    return {
      id: rate.id,
      companyId: rate.companyId,
      code: rate.code,
      normalizedCode: rate.normalizedCode,
      name: rate.name,
      percentage: decimalToString(rate.percentage),
      status: rate.status,
      treatmentId: rate.treatmentId ?? null,
      treatmentName: rate.treatment?.name ?? null,
      treatmentCategory: rate.treatment?.category ?? null,
      effectiveFrom: rate.effectiveFrom?.toISOString() ?? null,
      effectiveTo: rate.effectiveTo?.toISOString() ?? null,
      description: rate.description ?? null,
      isDefault: Boolean(rate.isDefault),
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    };
  }

  toTreatmentView(treatment: any): TaxTreatmentView {
    return {
      id: treatment.id,
      companyId: treatment.companyId,
      code: treatment.code,
      normalizedCode: treatment.normalizedCode,
      name: treatment.name,
      category: treatment.category,
      calculationMode: treatment.calculationMode,
      description: treatment.description ?? null,
      status: treatment.status,
      isDefault: Boolean(treatment.isDefault),
      effectiveFrom: treatment.effectiveFrom?.toISOString() ?? null,
      effectiveTo: treatment.effectiveTo?.toISOString() ?? null,
      createdAt: treatment.createdAt.toISOString(),
      updatedAt: treatment.updatedAt.toISOString(),
    };
  }

  toDefaultPolicyView(policy: any, rateLabel?: string | null, treatmentLabel?: string | null): TaxDefaultPolicyView {
    return {
      id: policy.id,
      companyId: policy.companyId,
      defaultCalculationMode: policy.defaultCalculationMode,
      defaultRateId: policy.defaultRateId ?? null,
      defaultRateLabel: rateLabel ?? null,
      defaultTreatmentId: policy.defaultTreatmentId ?? null,
      defaultTreatmentLabel: treatmentLabel ?? null,
      allowManualOverride: Boolean(policy.allowManualOverride),
      notes: policy.notes ?? null,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  toAccountBindingView(binding: any): TaxAccountBindingView {
    return {
      id: binding.id,
      companyId: binding.companyId,
      taxPayableAccountCode: binding.taxPayableAccountCode ?? null,
      recoverableTaxAccountCode: binding.recoverableTaxAccountCode ?? null,
      outputTaxAccountCode: binding.outputTaxAccountCode ?? null,
      inputTaxAccountCode: binding.inputTaxAccountCode ?? null,
      roundingAccountCode: binding.roundingAccountCode ?? null,
      notes: binding.notes ?? null,
      createdAt: binding.createdAt.toISOString(),
      updatedAt: binding.updatedAt.toISOString(),
    };
  }

  toApplicabilityRuleView(rule: any, rateLabel?: string | null, treatmentLabel?: string | null): TaxModuleApplicabilityRuleView {
    return {
      id: rule.id,
      companyId: rule.companyId,
      moduleKey: rule.moduleKey,
      isEnabled: Boolean(rule.isEnabled),
      allowOverride: Boolean(rule.allowOverride),
      defaultRateId: rule.defaultRateId ?? null,
      defaultRateLabel: rateLabel ?? null,
      defaultTreatmentId: rule.defaultTreatmentId ?? null,
      defaultTreatmentLabel: treatmentLabel ?? null,
      notes: rule.notes ?? null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }
}
