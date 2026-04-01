import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  CompanyUser,
  CompanyUserStatus,
  CredentialsResetChannel,
  CreateStaffUserRequest,
  ResetUserCredentialsResponse,
  StaffPermissionsMap,
  UpdateCompanyUserRequest,
  UpdateStaffPermissionsRequest,
  UsersFilters,
  UsersListMeta,
  UsersListResponse,
  UsersStats,
} from "../types/platform";

export interface PlatformUsersFilters extends UsersFilters {
  companyId: string;
}

export interface PlatformCompanyScopeRequest {
  companyId: string;
}

export interface PlatformCreateStaffUserRequest extends CreateStaffUserRequest {
  companyId: string;
}

export interface PlatformUpdateUserRequest extends UpdateCompanyUserRequest {
  companyId: string;
}

export interface PlatformUpdateUserPermissionsRequest
  extends UpdateStaffPermissionsRequest {
  companyId: string;
}

export interface PlatformResetUserCredentialsRequest {
  companyId: string;
  channel?: CredentialsResetChannel;
  reason?: string;
}

type UsersListApiPayload =
  | (ApiResponse<CompanyUser[]> & { meta?: unknown })
  | ApiEnvelope<{ items: CompanyUser[]; meta?: unknown }>
  | ApiEnvelope<CompanyUser[]>;

function toUsersListMeta(
  total: number,
  page: number,
  limit: number,
  meta?: unknown,
): UsersListMeta {
  const safeLimit = Math.max(limit || 10, 1);
  const fallbackTotalPages = Math.max(1, Math.ceil(Math.max(total, 0) / safeLimit));

  if (meta && typeof meta === "object") {
    const candidate = meta as Record<string, unknown>;
    const totalPages = Number(candidate.totalPages ?? fallbackTotalPages);
    const hasNext = Boolean(candidate.hasNext ?? candidate.hasNextPage ?? false);
    const hasPrev = Boolean(
      candidate.hasPrev ?? candidate.hasPrevious ?? candidate.hasPrevPage ?? page > 1,
    );

    return {
      total: Number(candidate.total ?? total),
      page: Number(candidate.page ?? page),
      limit: Number(candidate.limit ?? safeLimit),
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : fallbackTotalPages,
      hasNext,
      hasPrev,
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

function normalizeStaffPermissions(value: unknown): StaffPermissionsMap | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;

  return {
    manageUsers: Boolean(source.manageUsers),
    viewParties: Boolean(source.viewParties),
    manageParties: Boolean(source.manageParties),
    viewLedger: Boolean(source.viewLedger),
    manageLedger: Boolean(source.manageLedger),
    viewReports: Boolean(source.viewReports),
  };
}

function normalizeUser(value: unknown): CompanyUser {
  const source = (value ?? {}) as Record<string, unknown>;
  const rawPermissions = (source.permissions ?? null) as Record<string, unknown> | null;
  const nestedPermissions = rawPermissions?.permissions;

  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    fullName: String(source.fullName ?? ""),
    email: String(source.email ?? ""),
    phone: source.phone == null ? null : String(source.phone),
    role: (source.role as CompanyUser["role"]) ?? "STAFF",
    status: (source.status as CompanyUserStatus) ?? "ACTIVE",
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    updatedAt: String(source.updatedAt ?? new Date().toISOString()),
    permissions: rawPermissions
      ? {
          id: rawPermissions.id ? String(rawPermissions.id) : undefined,
          userId: rawPermissions.userId ? String(rawPermissions.userId) : undefined,
          permissions: normalizeStaffPermissions(nestedPermissions),
          createdAt: rawPermissions.createdAt ? String(rawPermissions.createdAt) : undefined,
          updatedAt: rawPermissions.updatedAt ? String(rawPermissions.updatedAt) : undefined,
        }
      : null,
  };
}

function normalizeUsersList(payload: UsersListApiPayload, filters: PlatformUsersFilters): UsersListResponse {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;

  if (isApiEnvelope<unknown>(payload)) {
    const data = payload.data;

    if (Array.isArray(data)) {
      const items = data.map(normalizeUser);
      return {
        items,
        meta: toUsersListMeta(items.length, page, limit, (payload as { meta?: unknown }).meta),
      };
    }

    if (data && typeof data === "object") {
      const structured = data as Record<string, unknown>;
      const items = Array.isArray(structured.items)
        ? structured.items.map(normalizeUser)
        : [];

      return {
        items,
        meta: toUsersListMeta(
          items.length,
          page,
          limit,
          structured.meta ?? (payload as { meta?: unknown }).meta,
        ),
      };
    }
  }

  const legacy = payload as { data?: unknown; meta?: unknown };
  const items = Array.isArray(legacy.data) ? legacy.data.map(normalizeUser) : [];

  return {
    items,
    meta: toUsersListMeta(items.length, page, limit, legacy.meta),
  };
}

function normalizeUsersStats(payload: unknown): UsersStats {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return {
    total: Number(source.total ?? 0),
    active: Number(source.active ?? 0),
    disabled: Number(source.disabled ?? 0),
    staff: Number(source.staff ?? 0),
    owners: Number(source.owners ?? 0),
  };
}

function normalizeResetCredentials(payload: unknown): ResetUserCredentialsResponse {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    userId: String(source.userId ?? ""),
    channel: (source.channel === "whatsapp" ? "whatsapp" : "email") as CredentialsResetChannel,
    expiresAt: String(source.expiresAt ?? new Date().toISOString()),
    sessionsRevoked: Boolean(source.sessionsRevoked),
  };
}

export const platformUsersApi = {
  async getAll(filters: PlatformUsersFilters): Promise<UsersListResponse> {
    const response = await httpClient.get<UsersListApiPayload>(API_ENDPOINTS.platform.users, {
      params: filters,
    });

    return normalizeUsersList(response.data, filters);
  },

  async getById(id: string, companyId: string): Promise<CompanyUser> {
    const response = await httpClient.get<CompanyUser | ApiResponse<CompanyUser>>(
      API_ENDPOINTS.platform.user(id),
      { params: { companyId } },
    );
    return normalizeUser(extractData(response.data));
  },

  async getStats(companyId: string): Promise<UsersStats> {
    const response = await httpClient.get<UsersStats | ApiResponse<UsersStats>>(
      API_ENDPOINTS.platform.usersStats,
      { params: { companyId } },
    );
    return normalizeUsersStats(extractData(response.data));
  },

  async createStaff(payload: PlatformCreateStaffUserRequest): Promise<CompanyUser> {
    const response = await httpClient.post<CompanyUser | ApiResponse<CompanyUser>>(
      API_ENDPOINTS.platform.createStaffUser,
      payload,
    );
    return normalizeUser(extractData(response.data));
  },

  async update(id: string, payload: PlatformUpdateUserRequest): Promise<CompanyUser> {
    const response = await httpClient.patch<CompanyUser | ApiResponse<CompanyUser>>(
      API_ENDPOINTS.platform.user(id),
      payload,
    );
    return normalizeUser(extractData(response.data));
  },

  async updatePermissions(
    id: string,
    payload: PlatformUpdateUserPermissionsRequest,
  ): Promise<StaffPermissionsMap> {
    const response = await httpClient.patch<
      { permissions?: StaffPermissionsMap } | ApiResponse<{ permissions?: StaffPermissionsMap }>
    >(API_ENDPOINTS.platform.updateUserPermissions(id), payload);

    const data = extractData(response.data);
    if (data && typeof data === "object" && "permissions" in data) {
      return normalizeStaffPermissions((data as { permissions?: unknown }).permissions) ?? {};
    }

    return normalizeStaffPermissions(data) ?? {};
  },

  async disable(id: string, scope: PlatformCompanyScopeRequest): Promise<CompanyUser> {
    const response = await httpClient.patch<CompanyUser | ApiResponse<CompanyUser>>(
      API_ENDPOINTS.platform.disableUser(id),
      scope,
    );
    return normalizeUser(extractData(response.data));
  },

  async enable(id: string, scope: PlatformCompanyScopeRequest): Promise<CompanyUser> {
    const response = await httpClient.patch<CompanyUser | ApiResponse<CompanyUser>>(
      API_ENDPOINTS.platform.enableUser(id),
      scope,
    );
    return normalizeUser(extractData(response.data));
  },

  async resetCredentials(
    id: string,
    payload: PlatformResetUserCredentialsRequest,
  ): Promise<ResetUserCredentialsResponse> {
    const response = await httpClient.post<
      ResetUserCredentialsResponse | ApiResponse<ResetUserCredentialsResponse>
    >(API_ENDPOINTS.platform.resetUserCredentials(id), payload);

    return normalizeResetCredentials(extractData(response.data));
  },
};
