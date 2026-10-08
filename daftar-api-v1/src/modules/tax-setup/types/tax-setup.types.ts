import {
  TaxCalculationMode,
  TaxLifecycleStatus,
  TaxModuleKey,
  TaxRegistrationStatus,
  TaxSetupReadinessStatus,
  TaxTreatmentCategory,
} from '@prisma/client';

export interface TaxListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TaxListResponse<T> {
  items: T[];
  meta: TaxListMeta;
}

export interface TaxRegistrationProfileView {
  id: string;
  companyId: string;
  countryCode: string;
  regimeCode: string | null;
  vatRegistrationStatus: TaxRegistrationStatus;
  vatRegistrationNumber: string | null;
  legalTaxName: string | null;
  registrationEffectiveDate: string | null;
  taxAddressLine1: string | null;
  taxAddressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  readinessStatus: TaxSetupReadinessStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRateView {
  id: string;
  companyId: string;
  code: string;
  normalizedCode: string;
  name: string;
  percentage: string;
  status: TaxLifecycleStatus;
  treatmentId: string | null;
  treatmentName: string | null;
  treatmentCategory: TaxTreatmentCategory | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxTreatmentView {
  id: string;
  companyId: string;
  code: string;
  normalizedCode: string;
  name: string;
  category: TaxTreatmentCategory;
  calculationMode: TaxCalculationMode;
  description: string | null;
  status: TaxLifecycleStatus;
  isDefault: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxDefaultPolicyView {
  id: string;
  companyId: string;
  defaultCalculationMode: TaxCalculationMode;
  defaultRateId: string | null;
  defaultRateLabel: string | null;
  defaultTreatmentId: string | null;
  defaultTreatmentLabel: string | null;
  allowManualOverride: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxAccountBindingView {
  id: string;
  companyId: string;
  taxPayableAccountCode: string | null;
  recoverableTaxAccountCode: string | null;
  outputTaxAccountCode: string | null;
  inputTaxAccountCode: string | null;
  roundingAccountCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxModuleApplicabilityRuleView {
  id: string;
  companyId: string;
  moduleKey: TaxModuleKey;
  isEnabled: boolean;
  allowOverride: boolean;
  defaultRateId: string | null;
  defaultRateLabel: string | null;
  defaultTreatmentId: string | null;
  defaultTreatmentLabel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
