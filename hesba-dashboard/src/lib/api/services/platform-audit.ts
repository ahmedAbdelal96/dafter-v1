import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";
import type { UserRole } from "../types/platform";
import httpClient from "../http-client";

export type PlatformAuditSortBy = "createdAt" | "action" | "entityType";
export type PlatformAuditSortOrder = "asc" | "desc";

export interface PlatformAuditFilters {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  actorUserId?: string;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: PlatformAuditSortBy;
  sortOrder?: PlatformAuditSortOrder;
}

export interface PlatformAuditActor {
  id: string;
  fullName: string | null;
  email: string;
  role: UserRole;
}

export interface PlatformAuditCompany {
  id: string;
  name: string;
}

export interface PlatformAuditLogRecord {
  id: string;
  companyId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorUser: PlatformAuditActor | null;
  company: PlatformAuditCompany | null;
}

export interface PlatformAuditLogsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PlatformAuditLogsResponse {
  items: PlatformAuditLogRecord[];
  meta: PlatformAuditLogsMeta;
}

export interface PlatformAuditLookupCompany {
  id: string;
  name: string;
}

export interface PlatformAuditLookupActor {
  id: string;
  fullName: string | null;
  email: string;
}

export interface PlatformAuditLookupsFilters {
  companySearch?: string;
  actorSearch?: string;
  companyId?: string;
  limit?: number;
}

export interface PlatformAuditLookupsResponse {
  companies: PlatformAuditLookupCompany[];
  actors: PlatformAuditLookupActor[];
  actions: string[];
  entityTypes: string[];
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAuditRecord(value: unknown): PlatformAuditLogRecord {
  const source = (value ?? {}) as Record<string, unknown>;
  const actorSource =
    source.actorUser && typeof source.actorUser === "object"
      ? (source.actorUser as Record<string, unknown>)
      : null;
  const companySource =
    source.company && typeof source.company === "object"
      ? (source.company as Record<string, unknown>)
      : null;
  const metadata =
    source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
      ? (source.metadata as Record<string, unknown>)
      : {};

  return {
    id: String(source.id ?? ""),
    companyId: String(source.companyId ?? ""),
    actorUserId: String(source.actorUserId ?? ""),
    action: String(source.action ?? ""),
    entityType: String(source.entityType ?? ""),
    entityId: source.entityId == null ? null : String(source.entityId),
    metadata,
    createdAt: String(source.createdAt ?? ""),
    actorUser: actorSource
      ? {
          id: String(actorSource.id ?? ""),
          fullName: actorSource.fullName == null ? null : String(actorSource.fullName),
          email: String(actorSource.email ?? ""),
          role: (actorSource.role as UserRole) ?? "STAFF",
        }
      : null,
    company: companySource
      ? {
          id: String(companySource.id ?? ""),
          name: String(companySource.name ?? ""),
        }
      : null,
  };
}

export const platformAuditApi = {
  async list(filters: PlatformAuditFilters = {}): Promise<PlatformAuditLogsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.platform.auditLogs, {
      params: filters,
    });

    const payload = response.data as unknown;
    const data = isApiEnvelope<unknown[]>(payload)
      ? payload.data
      : ((payload as { data?: unknown[] } | undefined)?.data ?? payload);
    const source = (payload ?? {}) as Record<string, unknown>;
    const metaSource =
      source.meta && typeof source.meta === "object"
        ? (source.meta as Record<string, unknown>)
        : {};

    const page = toNumber(metaSource.page, toNumber(filters.page, 1));
    const limit = toNumber(metaSource.limit, toNumber(filters.limit, 20));
    const total = toNumber(metaSource.total, 0);
    const totalPages = Math.max(
      1,
      toNumber(metaSource.totalPages, Math.ceil(total / Math.max(limit, 1))),
    );

    return {
      items: Array.isArray(data) ? data.map(normalizeAuditRecord) : [],
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

  async listLookups(
    filters: PlatformAuditLookupsFilters = {},
  ): Promise<PlatformAuditLookupsResponse> {
    const response = await httpClient.get(`${API_ENDPOINTS.platform.auditLogs}/lookups`, {
      params: filters,
    });

    const payload = response.data as unknown;
    const data = isApiEnvelope<unknown>(payload)
      ? payload.data
      : ((payload as { data?: unknown } | undefined)?.data ?? payload);
    const source = (data ?? {}) as Record<string, unknown>;

    const companies = Array.isArray(source.companies)
      ? source.companies.map((item) => {
          const value = (item ?? {}) as Record<string, unknown>;
          return {
            id: String(value.id ?? ""),
            name: String(value.name ?? ""),
          };
        })
      : [];

    const actors = Array.isArray(source.actors)
      ? source.actors.map((item) => {
          const value = (item ?? {}) as Record<string, unknown>;
          return {
            id: String(value.id ?? ""),
            fullName: value.fullName == null ? null : String(value.fullName),
            email: String(value.email ?? ""),
          };
        })
      : [];

    const actions = Array.isArray(source.actions)
      ? source.actions.map((item) => String(item))
      : [];
    const entityTypes = Array.isArray(source.entityTypes)
      ? source.entityTypes.map((item) => String(item))
      : [];

    return { companies, actors, actions, entityTypes };
  },
};
