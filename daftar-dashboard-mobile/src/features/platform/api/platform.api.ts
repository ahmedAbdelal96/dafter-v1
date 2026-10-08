import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Company,
  CompanyListResponse,
  CompanyMetrics,
  CompanyQuery,
  CreateCompanyDto,
  Plan,
  PlatformCreateStaffDto,
  PlatformUser,
  PlatformUserListResponse,
  PlatformUserQuery,
  PlatformUserStats,
  Subscription,
  ActivateSubscriptionDto,
  SuspendSubscriptionDto,
  ExtendSubscriptionDto,
  ChangePlanDto,
  UpdateCompanyDto,
  ArchiveCompanyDto,
  DeleteCompanyDto,
  PlatformCapabilities,
  PlatformAuditFilters,
  PlatformAuditLogsResponse,
  PlatformAuditLookupsFilters,
  PlatformAuditLookupsResponse,
  PlatformSettings,
  PlatformFeatureFlag,
} from '../types';

function generateIdempotencyKey(): string {
  // Prefer native randomUUID when available.
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const platformApi = {
  // ── Companies ──────────────────────────────────────────────────────────────

  listCompanies: async (params?: CompanyQuery): Promise<CompanyListResponse> => {
    const res = await apiClient.get<{
      data: { companies: Company[]; total: number; page: number; limit: number };
    }>(API_ENDPOINTS.platform.companies, { params });
    const { companies, total, page, limit } = res.data.data;
    return { data: companies, meta: { total, page, limit } };
  },

  getCompany: async (id: string): Promise<Company> => {
    const res = await apiClient.get<{ data: Company }>(API_ENDPOINTS.platform.company(id));
    return res.data.data;
  },

  getCompanyMetrics: async (id: string): Promise<CompanyMetrics> => {
    const res = await apiClient.get<{ data: CompanyMetrics }>(
      API_ENDPOINTS.platform.companyMetrics(id),
    );
    return res.data.data;
  },

  getCapabilities: async (): Promise<PlatformCapabilities> => {
    const res = await apiClient.get<{ data: PlatformCapabilities }>(
      API_ENDPOINTS.platform.capabilities,
    );
    return res.data.data;
  },

  listAuditLogs: async (
    filters: PlatformAuditFilters = {},
  ): Promise<PlatformAuditLogsResponse> => {
    const res = await apiClient.get<{
      data: unknown[];
      meta?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      };
    }>(API_ENDPOINTS.platform.auditLogs, { params: filters });

    const itemsRaw = Array.isArray(res.data.data) ? res.data.data : [];
    const metaRaw = res.data.meta ?? {};
    const page = toNumber(metaRaw.page, toNumber(filters.page, 1));
    const limit = toNumber(metaRaw.limit, toNumber(filters.limit, 20));
    const total = toNumber(metaRaw.total, 0);
    const totalPages = Math.max(
      1,
      toNumber(metaRaw.totalPages, Math.ceil(total / Math.max(limit, 1))),
    );

    return {
      items: itemsRaw.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        const actorUser =
          row.actorUser && typeof row.actorUser === 'object'
            ? (row.actorUser as Record<string, unknown>)
            : null;
        const company =
          row.company && typeof row.company === 'object'
            ? (row.company as Record<string, unknown>)
            : null;

        return {
          id: String(row.id ?? ''),
          companyId: String(row.companyId ?? ''),
          actorUserId: String(row.actorUserId ?? ''),
          action: String(row.action ?? ''),
          entityType: String(row.entityType ?? ''),
          entityId: row.entityId == null ? null : String(row.entityId),
          metadata:
            row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {},
          createdAt: String(row.createdAt ?? ''),
          actorUser: actorUser
            ? {
                id: String(actorUser.id ?? ''),
                fullName:
                  actorUser.fullName == null ? null : String(actorUser.fullName),
                email: String(actorUser.email ?? ''),
                role:
                  (actorUser.role as
                    | 'SUPER_ADMIN'
                    | 'OWNER'
                    | 'STAFF'
                    | 'ACCOUNTANT'
                    | 'RECEPTION') ?? 'STAFF',
              }
            : null,
          company: company
            ? {
                id: String(company.id ?? ''),
                name: String(company.name ?? ''),
              }
            : null,
        };
      }),
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

  getAuditLookups: async (
    filters: PlatformAuditLookupsFilters = {},
  ): Promise<PlatformAuditLookupsResponse> => {
    const res = await apiClient.get<{ data: unknown }>(
      API_ENDPOINTS.platform.auditLogLookups,
      { params: filters },
    );
    const data = (res.data.data ?? {}) as Record<string, unknown>;

    return {
      companies: Array.isArray(data.companies)
        ? data.companies.map((entry) => {
            const row = (entry ?? {}) as Record<string, unknown>;
            return {
              id: String(row.id ?? ''),
              name: String(row.name ?? ''),
            };
          })
        : [],
      actors: Array.isArray(data.actors)
        ? data.actors.map((entry) => {
            const row = (entry ?? {}) as Record<string, unknown>;
            return {
              id: String(row.id ?? ''),
              fullName: row.fullName == null ? null : String(row.fullName),
              email: String(row.email ?? ''),
            };
          })
        : [],
      actions: Array.isArray(data.actions)
        ? data.actions.map((entry) => String(entry))
        : [],
      entityTypes: Array.isArray(data.entityTypes)
        ? data.entityTypes.map((entry) => String(entry))
        : [],
    };
  },

  getSettings: async (): Promise<PlatformSettings> => {
    const res = await apiClient.get<{ data: PlatformSettings }>(
      API_ENDPOINTS.platform.settings,
    );
    return res.data.data;
  },

  getFeatureFlags: async (): Promise<PlatformFeatureFlag[]> => {
    const res = await apiClient.get<{ data: PlatformFeatureFlag[] }>(
      API_ENDPOINTS.platform.featureFlags,
    );
    return Array.isArray(res.data.data) ? res.data.data : [];
  },

  updateCompany: async (id: string, dto: UpdateCompanyDto): Promise<Company> => {
    const res = await apiClient.patch<{ data: Company }>(
      API_ENDPOINTS.platform.company(id),
      dto,
    );
    return res.data.data;
  },

  archiveCompany: async (id: string, dto?: ArchiveCompanyDto): Promise<Company> => {
    const res = await apiClient.patch<{ data: Company }>(
      API_ENDPOINTS.platform.archiveCompany(id),
      dto ?? {},
    );
    return res.data.data;
  },

  restoreCompany: async (id: string, dto?: ArchiveCompanyDto): Promise<Company> => {
    const res = await apiClient.patch<{ data: Company }>(
      API_ENDPOINTS.platform.restoreCompany(id),
      dto ?? {},
    );
    return res.data.data;
  },

  deleteCompany: async (id: string, dto: DeleteCompanyDto): Promise<Company> => {
    const res = await apiClient.delete<{ data: Company }>(
      API_ENDPOINTS.platform.deleteCompany(id),
      { data: dto },
    );
    return res.data.data;
  },

  disableCompany: async (id: string): Promise<Company> => {
    const res = await apiClient.patch<{ data: Company }>(
      API_ENDPOINTS.platform.disableCompany(id),
    );
    return res.data.data;
  },

  enableCompany: async (id: string): Promise<Company> => {
    const res = await apiClient.patch<{ data: Company }>(
      API_ENDPOINTS.platform.enableCompany(id),
    );
    return res.data.data;
  },

  // ── Subscriptions ─────────────────────────────────────────────────────────

  activateSubscription: async (dto: ActivateSubscriptionDto): Promise<Subscription> => {
    const idempotencyKey = generateIdempotencyKey();
    const res = await apiClient.post<{ data: Subscription }>(
      API_ENDPOINTS.platform.activateSubscription,
      dto,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
    return res.data.data;
  },

  suspendSubscription: async (dto: SuspendSubscriptionDto): Promise<Subscription> => {
    const idempotencyKey = generateIdempotencyKey();
    const res = await apiClient.post<{ data: Subscription }>(
      API_ENDPOINTS.platform.suspendSubscription,
      dto,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
    return res.data.data;
  },

  extendSubscription: async (dto: ExtendSubscriptionDto): Promise<Subscription> => {
    const idempotencyKey = generateIdempotencyKey();
    const res = await apiClient.post<{ data: Subscription }>(
      API_ENDPOINTS.platform.extendSubscription,
      dto,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
    return res.data.data;
  },

  changePlan: async (dto: ChangePlanDto): Promise<Subscription> => {
    const idempotencyKey = generateIdempotencyKey();
    const res = await apiClient.post<{ data: Subscription }>(
      API_ENDPOINTS.platform.changePlan,
      {
        ...dto,
        mode: 'IMMEDIATE',
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
    return res.data.data;
  },

  createCompany: async (dto: CreateCompanyDto): Promise<Company> => {
    const res = await apiClient.post<{ data: Company }>(API_ENDPOINTS.platform.companies, dto);
    return res.data.data;
  },

  // ── Plans ─────────────────────────────────────────────────────────────────

  listPlans: async (includeInactive = false): Promise<Plan[]> => {
    const res = await apiClient.get<{ data: Plan[] }>(API_ENDPOINTS.platform.plans, {
      params: includeInactive ? { includeInactive: 'true' } : undefined,
    });
    return res.data.data;
  },

  // ── Platform Users ────────────────────────────────────────────────────────

  listPlatformUsers: async (query: PlatformUserQuery): Promise<PlatformUserListResponse> => {
    const res = await apiClient.get<{
      data: { users?: PlatformUser[]; data?: PlatformUser[]; total: number; page: number; limit: number };
    }>(API_ENDPOINTS.platform.users, { params: query });
    const payload = res.data.data;
    // Normalise both { users: [] } and { data: [] } response shapes
    const users = payload.users ?? payload.data ?? [];
    return { data: users, meta: { total: payload.total ?? 0, page: payload.page ?? 1, limit: payload.limit ?? 20 } };
  },

  getPlatformUserStats: async (companyId: string): Promise<PlatformUserStats> => {
    const res = await apiClient.get<{ data: PlatformUserStats }>(
      API_ENDPOINTS.platform.userStats,
      { params: { companyId } },
    );
    return res.data.data;
  },

  createPlatformStaff: async (dto: PlatformCreateStaffDto): Promise<PlatformUser> => {
    const res = await apiClient.post<{ data: PlatformUser }>(
      API_ENDPOINTS.platform.createStaff,
      dto,
    );
    return res.data.data;
  },

  updatePlatformUser: async (
    id: string,
    dto: { companyId: string; fullName?: string; phone?: string },
  ): Promise<PlatformUser> => {
    const res = await apiClient.patch<{ data: PlatformUser }>(
      API_ENDPOINTS.platform.updateUser(id),
      dto,
    );
    return res.data.data;
  },

  disablePlatformUser: async (id: string, companyId: string): Promise<PlatformUser> => {
    const res = await apiClient.patch<{ data: PlatformUser }>(
      API_ENDPOINTS.platform.disableUser(id),
      { companyId },
    );
    return res.data.data;
  },

  enablePlatformUser: async (id: string, companyId: string): Promise<PlatformUser> => {
    const res = await apiClient.patch<{ data: PlatformUser }>(
      API_ENDPOINTS.platform.enableUser(id),
      { companyId },
    );
    return res.data.data;
  },
};
