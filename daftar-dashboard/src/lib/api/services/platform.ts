import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";

export interface PlatformCompaniesFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "DISABLED";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PlatformPlan {
  id: string;
  name: string;
  price: number;
  currencyCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  maxUsers: number | null;
  maxCustomers: number | null;
  maxSuppliers: number | null;
  maxEmployees: number | null;
  maxLedgerEntries: number | null;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export interface PlatformPlanInput {
  name: string;
  price: number;
  currencyCode?: string;
  billingCycle: "MONTHLY" | "YEARLY";
  maxUsers?: number;
  maxCustomers?: number;
  maxSuppliers?: number;
  maxEmployees?: number;
  maxLedgerEntries?: number;
  features?: string[];
  isActive?: boolean;
}

export type CreatePlatformPlanRequest = PlatformPlanInput;
export type UpdatePlatformPlanRequest = Partial<PlatformPlanInput>;

export interface PlatformCompanySubscription {
  id: string;
  companyId: string;
  planId: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "DISABLED";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  createdAt: string;
  updatedAt?: string;
  plan?: Pick<PlatformPlan, "id" | "name" | "price" | "billingCycle">;
}

export interface PlatformCompanyListItem {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currencyCode: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  latestSubscription: PlatformCompanySubscription | null;
}

export interface PlatformCompaniesResponse {
  items: PlatformCompanyListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PlatformCompanyDetails {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currencyCode: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  subscriptions: PlatformCompanySubscription[];
  counts: {
    users: number;
    customers: number;
    suppliers: number;
    employees: number;
    ledgerEntries: number;
  };
}

export interface PlatformCompanyMetrics {
  companyId: string;
  companyName: string;
  usersCount: number;
  customersCount: number;
  suppliersCount: number;
  employeesCount: number;
  ledgerEntriesCount: number;
  subscription: PlatformCompanySubscription | null;
}

export interface ActivatePlatformSubscriptionRequest {
  companyId: string;
  planId: string;
  endDate: string;
  autoRenew?: boolean;
  note?: string;
}

export interface SuspendPlatformSubscriptionRequest {
  companyId: string;
  reason?: string;
}

export interface ExtendPlatformSubscriptionRequest {
  companyId: string;
  newEndDate: string;
  reason?: string;
}

export interface ChangePlatformSubscriptionPlanRequest {
  companyId: string;
  newPlanId: string;
  mode?: "IMMEDIATE";
  reason?: string;
  idempotencyKey?: string;
}

export interface CreatePlatformCompanyRequest {
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  currencyCode?: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone?: string;
  planId: string;
  trialDays?: number;
  termMonths?: number;
  subscriptionEndDate?: string;
  autoRenew?: boolean;
}

export interface UpdatePlatformCompanyRequest {
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  currencyCode?: string;
}

export interface ArchivePlatformCompanyRequest {
  reason?: string;
}

export interface DeletePlatformCompanyRequest {
  confirmCompanyName: string;
  reason?: string;
}

export interface PlatformCompanyEntity {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currencyCode: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCapabilities {
  canHardDeleteCompany: boolean;
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  const source = payload as { data?: T } | null | undefined;
  return (source?.data ?? payload) as T;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}

function normalizeSubscription(value: unknown): PlatformCompanySubscription | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;

  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    planId: String(source.planId ?? ""),
    status: (source.status as PlatformCompanySubscription["status"]) ?? "EXPIRED",
    startDate: String(source.startDate ?? ""),
    endDate: String(source.endDate ?? ""),
    autoRenew: Boolean(source.autoRenew),
    paymentStatus:
      (source.paymentStatus as PlatformCompanySubscription["paymentStatus"]) ?? "PENDING",
    createdAt: String(source.createdAt ?? ""),
    updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
    plan:
      source.plan && typeof source.plan === "object"
        ? {
            id: String((source.plan as Record<string, unknown>).id ?? ""),
            name: String((source.plan as Record<string, unknown>).name ?? ""),
            price: toNumber((source.plan as Record<string, unknown>).price),
            billingCycle:
              ((source.plan as Record<string, unknown>).billingCycle as "MONTHLY" | "YEARLY") ??
              "MONTHLY",
          }
        : undefined,
  };
}

function normalizeCompanyListItem(value: unknown): PlatformCompanyListItem {
  const source = (value ?? {}) as Record<string, unknown>;
  const subscriptions = Array.isArray(source.subscriptions) ? source.subscriptions : [];
  const countSource =
    source._count && typeof source._count === "object"
      ? (source._count as Record<string, unknown>)
      : {};

  return {
    id: String(source.id ?? ""),
    name: String(source.name ?? ""),
    phone: source.phone == null ? null : String(source.phone),
    address: source.address == null ? null : String(source.address),
    currencyCode: String(source.currencyCode ?? "EGP"),
    isActive: Boolean(source.isActive),
    isDeleted: Boolean(source.isDeleted),
    createdAt: String(source.createdAt ?? ""),
    updatedAt: String(source.updatedAt ?? ""),
    usersCount: toNumber(countSource.users),
    latestSubscription: normalizeSubscription(subscriptions[0]),
  };
}

function normalizeCompanyDetails(value: unknown): PlatformCompanyDetails {
  const source = (value ?? {}) as Record<string, unknown>;
  const countSource =
    source._count && typeof source._count === "object"
      ? (source._count as Record<string, unknown>)
      : {};
  const subscriptions = Array.isArray(source.subscriptions) ? source.subscriptions : [];

  return {
    id: String(source.id ?? ""),
    name: String(source.name ?? ""),
    phone: source.phone == null ? null : String(source.phone),
    address: source.address == null ? null : String(source.address),
    currencyCode: String(source.currencyCode ?? "EGP"),
    isActive: Boolean(source.isActive),
    isDeleted: Boolean(source.isDeleted),
    createdAt: String(source.createdAt ?? ""),
    updatedAt: String(source.updatedAt ?? ""),
    subscriptions: subscriptions.map(normalizeSubscription).filter(Boolean) as PlatformCompanySubscription[],
    counts: {
      users: toNumber(countSource.users),
      customers: toNumber(countSource.customers),
      suppliers: toNumber(countSource.suppliers),
      employees: toNumber(countSource.employees),
      ledgerEntries: toNumber(countSource.ledgerEntries),
    },
  };
}

function normalizeMetrics(value: unknown): PlatformCompanyMetrics {
  const source = (value ?? {}) as Record<string, unknown>;

  return {
    companyId: String(source.companyId ?? ""),
    companyName: String(source.companyName ?? ""),
    usersCount: toNumber(source.usersCount),
    customersCount: toNumber(source.customersCount),
    suppliersCount: toNumber(source.suppliersCount),
    employeesCount: toNumber(source.employeesCount),
    ledgerEntriesCount: toNumber(source.ledgerEntriesCount),
    subscription: normalizeSubscription(source.subscription),
  };
}

function normalizePlan(value: unknown): PlatformPlan {
  const source = (value ?? {}) as Record<string, unknown>;
  const features = Array.isArray(source.features)
    ? source.features.map((item) => String(item))
    : [];
  return {
    id: String(source.id ?? ""),
    name: String(source.name ?? ""),
    price: toNumber(source.price),
    currencyCode: String(source.currencyCode ?? "EGP"),
    billingCycle: (source.billingCycle as "MONTHLY" | "YEARLY") ?? "MONTHLY",
    maxUsers: source.maxUsers == null ? null : toNumber(source.maxUsers),
    maxCustomers: source.maxCustomers == null ? null : toNumber(source.maxCustomers),
    maxSuppliers: source.maxSuppliers == null ? null : toNumber(source.maxSuppliers),
    maxEmployees: source.maxEmployees == null ? null : toNumber(source.maxEmployees),
    maxLedgerEntries:
      source.maxLedgerEntries == null ? null : toNumber(source.maxLedgerEntries),
    features,
    isActive: Boolean(source.isActive),
    createdAt: String(source.createdAt ?? ""),
  };
}

function normalizeCompanyEntity(value: unknown): PlatformCompanyEntity {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    name: String(source.name ?? ""),
    phone: source.phone == null ? null : String(source.phone),
    address: source.address == null ? null : String(source.address),
    currencyCode: String(source.currencyCode ?? "EGP"),
    isActive: Boolean(source.isActive),
    isDeleted: Boolean(source.isDeleted),
    createdAt: String(source.createdAt ?? ""),
    updatedAt: String(source.updatedAt ?? ""),
  };
}

export const platformApi = {
  async createCompany(payload: CreatePlatformCompanyRequest) {
    const response = await httpClient.post(API_ENDPOINTS.platform.companies, payload);
    return normalizeCompanyDetails(unwrapEnvelope(response.data));
  },

  async listCompanies(filters: PlatformCompaniesFilters = {}): Promise<PlatformCompaniesResponse> {
    const response = await httpClient.get(API_ENDPOINTS.platform.companies, {
      params: filters,
    });
    const data = unwrapEnvelope<{
      companies: unknown[];
      total: number;
      page: number;
      limit: number;
    }>(response.data);

    const total = toNumber(data.total);
    const page = toNumber(data.page || filters.page || 1);
    const limit = toNumber(data.limit || filters.limit || 20);
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / Math.max(limit, 1)));

    return {
      items: Array.isArray(data.companies) ? data.companies.map(normalizeCompanyListItem) : [],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  async getCompany(id: string): Promise<PlatformCompanyDetails> {
    const response = await httpClient.get(API_ENDPOINTS.platform.company(id));
    return normalizeCompanyDetails(unwrapEnvelope(response.data));
  },

  async getCompanyMetrics(id: string): Promise<PlatformCompanyMetrics> {
    const response = await httpClient.get(API_ENDPOINTS.platform.companyMetrics(id));
    return normalizeMetrics(unwrapEnvelope(response.data));
  },

  async updateCompany(id: string, payload: UpdatePlatformCompanyRequest): Promise<PlatformCompanyEntity> {
    const response = await httpClient.patch(API_ENDPOINTS.platform.company(id), payload);
    return normalizeCompanyEntity(unwrapEnvelope(response.data));
  },

  async disableCompany(id: string): Promise<PlatformCompanyEntity> {
    const response = await httpClient.patch(API_ENDPOINTS.platform.disableCompany(id));
    return normalizeCompanyEntity(unwrapEnvelope(response.data));
  },

  async enableCompany(id: string): Promise<PlatformCompanyEntity> {
    const response = await httpClient.patch(API_ENDPOINTS.platform.enableCompany(id));
    return normalizeCompanyEntity(unwrapEnvelope(response.data));
  },

  async archiveCompany(
    id: string,
    payload: ArchivePlatformCompanyRequest = {},
  ): Promise<PlatformCompanyEntity> {
    const response = await httpClient.patch(
      API_ENDPOINTS.platform.archiveCompany(id),
      payload,
    );
    return normalizeCompanyEntity(unwrapEnvelope(response.data));
  },

  async restoreCompany(
    id: string,
    payload: ArchivePlatformCompanyRequest = {},
  ): Promise<PlatformCompanyEntity> {
    const response = await httpClient.patch(
      API_ENDPOINTS.platform.restoreCompany(id),
      payload,
    );
    return normalizeCompanyEntity(unwrapEnvelope(response.data));
  },

  async deleteCompany(id: string, payload: DeletePlatformCompanyRequest) {
    const response = await httpClient.delete(API_ENDPOINTS.platform.company(id), {
      data: payload,
    });
    return unwrapEnvelope<{ id: string; deleted: boolean }>(response.data);
  },

  async listPlans(includeInactive = false): Promise<PlatformPlan[]> {
    const response = await httpClient.get(API_ENDPOINTS.platform.plans, {
      params: { includeInactive },
    });
    const data = unwrapEnvelope<unknown[]>(response.data);
    return Array.isArray(data) ? data.map(normalizePlan) : [];
  },

  async createPlan(payload: CreatePlatformPlanRequest): Promise<PlatformPlan> {
    const response = await httpClient.post(API_ENDPOINTS.platform.plans, payload);
    return normalizePlan(unwrapEnvelope(response.data));
  },

  async updatePlan(id: string, payload: UpdatePlatformPlanRequest): Promise<PlatformPlan> {
    const response = await httpClient.patch(API_ENDPOINTS.platform.plan(id), payload);
    return normalizePlan(unwrapEnvelope(response.data));
  },

  async getCapabilities(): Promise<PlatformCapabilities> {
    const response = await httpClient.get(API_ENDPOINTS.platform.capabilities);
    return unwrapEnvelope<PlatformCapabilities>(response.data);
  },

  async activateSubscription(payload: ActivatePlatformSubscriptionRequest) {
    const response = await httpClient.post(
      API_ENDPOINTS.platform.activateSubscription,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async suspendSubscription(payload: SuspendPlatformSubscriptionRequest) {
    const response = await httpClient.post(
      API_ENDPOINTS.platform.suspendSubscription,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async extendSubscription(payload: ExtendPlatformSubscriptionRequest) {
    const response = await httpClient.post(
      API_ENDPOINTS.platform.extendSubscription,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async changePlan(payload: ChangePlatformSubscriptionPlanRequest) {
    const response = await httpClient.post(
      API_ENDPOINTS.platform.changePlan,
      payload,
    );
    return unwrapEnvelope(response.data);
  },
};
