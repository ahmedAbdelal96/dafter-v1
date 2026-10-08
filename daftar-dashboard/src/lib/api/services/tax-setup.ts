import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type { ApiResponse } from "../types";

export type TaxLifecycleStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type TaxRegistrationStatus = "NOT_REGISTERED" | "REGISTERED" | "SUSPENDED" | "CANCELLED";
export type TaxCalculationMode = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE";
export type TaxTreatmentCategory = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE";
export type TaxModuleKey = "sales" | "purchases" | "expenses" | "journals";

export interface TaxRegistrationProfile {
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
  readinessStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRate {
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

export interface TaxTreatment {
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

export interface TaxDefaultPolicy {
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

export interface TaxAccountBinding {
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

export interface TaxApplicabilityRule {
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

export interface TaxSearchParams {
  search?: string;
  page?: number;
  limit?: number;
  activeOnly?: boolean;
  includeArchived?: boolean;
}

export interface CreateTaxRegistrationProfileRequest {
  countryCode: string;
  regimeCode?: string | null;
  vatRegistrationStatus?: TaxRegistrationStatus;
  vatRegistrationNumber?: string | null;
  legalTaxName?: string | null;
  registrationEffectiveDate?: string | null;
  taxAddressLine1?: string | null;
  taxAddressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  readinessStatus?: string;
  notes?: string | null;
}

export type UpdateTaxRegistrationProfileRequest = Partial<CreateTaxRegistrationProfileRequest>;

export interface CreateTaxRateRequest {
  code: string;
  name: string;
  percentage: number;
  status?: TaxLifecycleStatus;
  category?: TaxTreatmentCategory;
  treatmentId?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string | null;
  isDefault?: boolean;
}

export type UpdateTaxRateRequest = Partial<CreateTaxRateRequest>;

export interface CreateTaxTreatmentRequest {
  code: string;
  name: string;
  category: TaxTreatmentCategory;
  calculationMode: TaxCalculationMode;
  description?: string | null;
  isDefault?: boolean;
  status?: TaxLifecycleStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export type UpdateTaxTreatmentRequest = Partial<CreateTaxTreatmentRequest>;

export interface UpdateTaxDefaultPolicyRequest {
  defaultCalculationMode?: TaxCalculationMode;
  defaultRateId?: string | null;
  defaultTreatmentId?: string | null;
  allowManualOverride?: boolean;
  notes?: string | null;
}

export interface UpdateTaxAccountBindingRequest {
  taxPayableAccountCode?: string | null;
  recoverableTaxAccountCode?: string | null;
  outputTaxAccountCode?: string | null;
  inputTaxAccountCode?: string | null;
  roundingAccountCode?: string | null;
  notes?: string | null;
}

export interface UpdateTaxApplicabilityRuleRequest {
  isEnabled?: boolean;
  allowOverride?: boolean;
  defaultRateId?: string | null;
  defaultTreatmentId?: string | null;
  notes?: string | null;
}

function normalizeListMeta(total: number, page: number, limit: number, meta?: unknown): TaxListMeta {
  const safeLimit = Math.max(limit || 10, 1);
  const fallbackTotalPages = Math.max(1, Math.ceil(Math.max(total, 0) / safeLimit));

  if (meta && typeof meta === "object") {
    const source = meta as Record<string, unknown>;
    const totalPages = Number(source.totalPages ?? fallbackTotalPages);

    return {
      total: Number(source.total ?? total),
      page: Number(source.page ?? page),
      limit: Number(source.limit ?? safeLimit),
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : fallbackTotalPages,
      hasNext: Boolean(source.hasNext ?? source.hasNextPage ?? page < fallbackTotalPages),
      hasPrev: Boolean(source.hasPrev ?? source.hasPrevPage ?? page > 1),
    };
  }

  return {
    total,
    page,
    limit: safeLimit,
    totalPages: fallbackTotalPages,
    hasNext: page < fallbackTotalPages,
    hasPrev: page > 1,
  };
}

function normalizeListPayload<T>(
  payload: unknown,
  page = 1,
  limit = 20,
  mapItem: (item: unknown) => T,
): TaxListResponse<T> {
  if (payload && typeof payload === "object" && "data" in payload) {
    const envelope = payload as ApiResponse<unknown> & { meta?: unknown };
    const data = envelope.data as unknown;

    if (Array.isArray(data)) {
      const items = data.map(mapItem);
      return { items, meta: normalizeListMeta(items.length, page, limit, envelope.meta) };
    }

    if (data && typeof data === "object") {
      const structured = data as Record<string, unknown>;
      const items = Array.isArray(structured.items) ? structured.items.map(mapItem) : [];
      return {
        items,
        meta: normalizeListMeta(items.length, page, limit, structured.meta ?? envelope.meta),
      };
    }
  }

  const raw = payload as { items?: unknown[]; meta?: unknown };
  const items = Array.isArray(raw?.items) ? raw.items.map(mapItem) : [];
  return { items, meta: normalizeListMeta(items.length, page, limit, raw?.meta) };
}

function toStringOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function normalizeTaxRate(value: unknown): TaxRate {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    code: String(source.code ?? ""),
    normalizedCode: String(source.normalizedCode ?? ""),
    name: String(source.name ?? ""),
    percentage: String(source.percentage ?? "0"),
    status: (source.status as TaxLifecycleStatus) ?? "ACTIVE",
    treatmentId: toStringOrNull(source.treatmentId),
    treatmentName: toStringOrNull(source.treatmentName),
    treatmentCategory: (source.treatmentCategory as TaxTreatmentCategory) ?? null,
    effectiveFrom: toStringOrNull(source.effectiveFrom),
    effectiveTo: toStringOrNull(source.effectiveTo),
    description: toStringOrNull(source.description),
    isDefault: Boolean(source.isDefault),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeTaxTreatment(value: unknown): TaxTreatment {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    code: String(source.code ?? ""),
    normalizedCode: String(source.normalizedCode ?? ""),
    name: String(source.name ?? ""),
    category: (source.category as TaxTreatmentCategory) ?? "STANDARD",
    calculationMode: (source.calculationMode as TaxCalculationMode) ?? "TAX_EXCLUSIVE",
    description: toStringOrNull(source.description),
    status: (source.status as TaxLifecycleStatus) ?? "ACTIVE",
    isDefault: Boolean(source.isDefault),
    effectiveFrom: toStringOrNull(source.effectiveFrom),
    effectiveTo: toStringOrNull(source.effectiveTo),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeProfile(value: unknown): TaxRegistrationProfile {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    countryCode: String(source.countryCode ?? "EG"),
    regimeCode: toStringOrNull(source.regimeCode),
    vatRegistrationStatus: (source.vatRegistrationStatus as TaxRegistrationStatus) ?? "NOT_REGISTERED",
    vatRegistrationNumber: toStringOrNull(source.vatRegistrationNumber),
    legalTaxName: toStringOrNull(source.legalTaxName),
    registrationEffectiveDate: toStringOrNull(source.registrationEffectiveDate),
    taxAddressLine1: toStringOrNull(source.taxAddressLine1),
    taxAddressLine2: toStringOrNull(source.taxAddressLine2),
    city: toStringOrNull(source.city),
    region: toStringOrNull(source.region),
    postalCode: toStringOrNull(source.postalCode),
    readinessStatus: String(source.readinessStatus ?? "NOT_CONFIGURED"),
    notes: toStringOrNull(source.notes),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
  };
}

function normalizePolicy(value: unknown): TaxDefaultPolicy {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    defaultCalculationMode: (source.defaultCalculationMode as TaxCalculationMode) ?? "TAX_EXCLUSIVE",
    defaultRateId: toStringOrNull(source.defaultRateId),
    defaultRateLabel: toStringOrNull(source.defaultRateLabel),
    defaultTreatmentId: toStringOrNull(source.defaultTreatmentId),
    defaultTreatmentLabel: toStringOrNull(source.defaultTreatmentLabel),
    allowManualOverride: Boolean(source.allowManualOverride),
    notes: toStringOrNull(source.notes),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeBinding(value: unknown): TaxAccountBinding {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    taxPayableAccountCode: toStringOrNull(source.taxPayableAccountCode),
    recoverableTaxAccountCode: toStringOrNull(source.recoverableTaxAccountCode),
    outputTaxAccountCode: toStringOrNull(source.outputTaxAccountCode),
    inputTaxAccountCode: toStringOrNull(source.inputTaxAccountCode),
    roundingAccountCode: toStringOrNull(source.roundingAccountCode),
    notes: toStringOrNull(source.notes),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeRule(value: unknown): TaxApplicabilityRule {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    moduleKey: (source.moduleKey as TaxModuleKey) ?? "sales",
    isEnabled: Boolean(source.isEnabled),
    allowOverride: Boolean(source.allowOverride),
    defaultRateId: toStringOrNull(source.defaultRateId),
    defaultRateLabel: toStringOrNull(source.defaultRateLabel),
    defaultTreatmentId: toStringOrNull(source.defaultTreatmentId),
    defaultTreatmentLabel: toStringOrNull(source.defaultTreatmentLabel),
    notes: toStringOrNull(source.notes),
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
  };
}

export const taxSetupApi = {
  getRegistrationProfile() {
    return httpClient
      .get<ApiResponse<TaxRegistrationProfile>>(API_ENDPOINTS.taxSetup.registrationProfile)
      .then((response) => normalizeProfile(extractData(response.data)));
  },
  updateRegistrationProfile(payload: UpdateTaxRegistrationProfileRequest) {
    return httpClient
      .patch<ApiResponse<TaxRegistrationProfile>>(API_ENDPOINTS.taxSetup.registrationProfile, payload)
      .then((response) => normalizeProfile(extractData(response.data)));
  },
  listTaxRates(filters: TaxSearchParams = {}) {
    return httpClient
      .get<ApiResponse<TaxRate[]>>(API_ENDPOINTS.taxSetup.taxRates, { params: filters })
      .then((response) => normalizeListPayload(extractData(response.data), filters.page, filters.limit, normalizeTaxRate));
  },
  searchTaxRates(filters: TaxSearchParams = {}) {
    return httpClient
      .get<ApiResponse<TaxRate[]>>(API_ENDPOINTS.taxSetup.taxRateSearch, { params: filters })
      .then((response) => normalizeListPayload(extractData(response.data), filters.page, filters.limit, normalizeTaxRate));
  },
  getTaxRate(id: string) {
    return httpClient
      .get<ApiResponse<TaxRate>>(API_ENDPOINTS.taxSetup.taxRate(id))
      .then((response) => normalizeTaxRate(extractData(response.data)));
  },
  createTaxRate(payload: CreateTaxRateRequest) {
    return httpClient
      .post<ApiResponse<TaxRate>>(API_ENDPOINTS.taxSetup.taxRates, payload)
      .then((response) => normalizeTaxRate(extractData(response.data)));
  },
  updateTaxRate(id: string, payload: UpdateTaxRateRequest) {
    return httpClient
      .patch<ApiResponse<TaxRate>>(API_ENDPOINTS.taxSetup.taxRate(id), payload)
      .then((response) => normalizeTaxRate(extractData(response.data)));
  },
  inactivateTaxRate(id: string) {
    return httpClient
      .post<ApiResponse<TaxRate>>(API_ENDPOINTS.taxSetup.taxRateInactivate(id))
      .then((response) => normalizeTaxRate(extractData(response.data)));
  },
  archiveTaxRate(id: string) {
    return httpClient
      .post<ApiResponse<TaxRate>>(API_ENDPOINTS.taxSetup.taxRateArchive(id))
      .then((response) => normalizeTaxRate(extractData(response.data)));
  },
  listTaxTreatments(filters: TaxSearchParams = {}) {
    return httpClient
      .get<ApiResponse<TaxTreatment[]>>(API_ENDPOINTS.taxSetup.taxTreatments, { params: filters })
      .then((response) =>
        normalizeListPayload(extractData(response.data), filters.page, filters.limit, normalizeTaxTreatment),
      );
  },
  searchTaxTreatments(filters: TaxSearchParams = {}) {
    return httpClient
      .get<ApiResponse<TaxTreatment[]>>(API_ENDPOINTS.taxSetup.taxTreatmentSearch, { params: filters })
      .then((response) =>
        normalizeListPayload(extractData(response.data), filters.page, filters.limit, normalizeTaxTreatment),
      );
  },
  getTaxTreatment(id: string) {
    return httpClient
      .get<ApiResponse<TaxTreatment>>(API_ENDPOINTS.taxSetup.taxTreatment(id))
      .then((response) => normalizeTaxTreatment(extractData(response.data)));
  },
  createTaxTreatment(payload: CreateTaxTreatmentRequest) {
    return httpClient
      .post<ApiResponse<TaxTreatment>>(API_ENDPOINTS.taxSetup.taxTreatments, payload)
      .then((response) => normalizeTaxTreatment(extractData(response.data)));
  },
  updateTaxTreatment(id: string, payload: UpdateTaxTreatmentRequest) {
    return httpClient
      .patch<ApiResponse<TaxTreatment>>(API_ENDPOINTS.taxSetup.taxTreatment(id), payload)
      .then((response) => normalizeTaxTreatment(extractData(response.data)));
  },
  inactivateTaxTreatment(id: string) {
    return httpClient
      .post<ApiResponse<TaxTreatment>>(API_ENDPOINTS.taxSetup.taxTreatmentInactivate(id))
      .then((response) => normalizeTaxTreatment(extractData(response.data)));
  },
  archiveTaxTreatment(id: string) {
    return httpClient
      .post<ApiResponse<TaxTreatment>>(API_ENDPOINTS.taxSetup.taxTreatmentArchive(id))
      .then((response) => normalizeTaxTreatment(extractData(response.data)));
  },
  getDefaultPolicy() {
    return httpClient
      .get<ApiResponse<TaxDefaultPolicy>>(API_ENDPOINTS.taxSetup.defaultPolicy)
      .then((response) => normalizePolicy(extractData(response.data)));
  },
  updateDefaultPolicy(payload: UpdateTaxDefaultPolicyRequest) {
    return httpClient
      .patch<ApiResponse<TaxDefaultPolicy>>(API_ENDPOINTS.taxSetup.defaultPolicy, payload)
      .then((response) => normalizePolicy(extractData(response.data)));
  },
  getAccountBindings() {
    return httpClient
      .get<ApiResponse<TaxAccountBinding>>(API_ENDPOINTS.taxSetup.accountBindings)
      .then((response) => normalizeBinding(extractData(response.data)));
  },
  updateAccountBindings(payload: UpdateTaxAccountBindingRequest) {
    return httpClient
      .patch<ApiResponse<TaxAccountBinding>>(API_ENDPOINTS.taxSetup.accountBindings, payload)
      .then((response) => normalizeBinding(extractData(response.data)));
  },
  listModuleApplicabilityRules() {
    return httpClient
      .get<ApiResponse<TaxApplicabilityRule[]>>(API_ENDPOINTS.taxSetup.moduleApplicabilityRules)
      .then((response) => normalizeListPayload(extractData(response.data), 1, 100, normalizeRule));
  },
  updateModuleApplicabilityRule(moduleKey: TaxModuleKey, payload: UpdateTaxApplicabilityRuleRequest) {
    return httpClient
      .patch<ApiResponse<TaxApplicabilityRule>>(API_ENDPOINTS.taxSetup.moduleApplicabilityRule(moduleKey), payload)
      .then((response) => normalizeRule(extractData(response.data)));
  },
};
