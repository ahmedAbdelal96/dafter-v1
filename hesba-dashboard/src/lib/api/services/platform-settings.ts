import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";

export type PlatformProrationMode = "NONE" | "IMMEDIATE" | "NEXT_CYCLE";

export interface PlatformSettings {
  trialDefaults: {
    durationDays: number;
    autoActivateOnSignup: boolean;
    requireCompanyPhone: boolean;
  };
  subscriptionPolicies: {
    gracePeriodDays: number;
    allowPlanDowngrade: boolean;
    allowPlanUpgrade: boolean;
    enforceSingleActiveSubscription: boolean;
    prorationMode: PlatformProrationMode;
  };
  governanceGuardrails: {
    strictQuotaEnforcement: boolean;
    blockOnExpiredSubscription: boolean;
    allowReadOnlyDuringGracePeriod: boolean;
  };
  updatedAt: string;
}

export interface PlatformFeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedCompanies: string[];
  blockedCompanies: string[];
  description: string;
  createdAt: string;
  lastModified: string;
}

export interface UpdatePlatformSettingsRequest {
  trialDefaults?: Partial<PlatformSettings["trialDefaults"]>;
  subscriptionPolicies?: Partial<PlatformSettings["subscriptionPolicies"]>;
  governanceGuardrails?: Partial<PlatformSettings["governanceGuardrails"]>;
}

export interface CreateFeatureFlagRequest {
  name: string;
  description: string;
  enabled?: boolean;
  rolloutPercentage?: number;
}

export interface UpdateFeatureFlagRequest {
  enabled?: boolean;
  rolloutPercentage?: number;
  description?: string;
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  const source = payload as { data?: T } | null | undefined;
  return (source?.data ?? payload) as T;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSettings(value: unknown): PlatformSettings {
  const source = (value ?? {}) as Record<string, unknown>;
  const trialDefaults =
    source.trialDefaults && typeof source.trialDefaults === "object"
      ? (source.trialDefaults as Record<string, unknown>)
      : {};
  const subscriptionPolicies =
    source.subscriptionPolicies && typeof source.subscriptionPolicies === "object"
      ? (source.subscriptionPolicies as Record<string, unknown>)
      : {};
  const governanceGuardrails =
    source.governanceGuardrails && typeof source.governanceGuardrails === "object"
      ? (source.governanceGuardrails as Record<string, unknown>)
      : {};

  return {
    trialDefaults: {
      durationDays: toNumber(trialDefaults.durationDays, 14),
      autoActivateOnSignup: Boolean(trialDefaults.autoActivateOnSignup),
      requireCompanyPhone: Boolean(trialDefaults.requireCompanyPhone),
    },
    subscriptionPolicies: {
      gracePeriodDays: toNumber(subscriptionPolicies.gracePeriodDays, 3),
      allowPlanDowngrade: Boolean(subscriptionPolicies.allowPlanDowngrade),
      allowPlanUpgrade: Boolean(subscriptionPolicies.allowPlanUpgrade),
      enforceSingleActiveSubscription: Boolean(
        subscriptionPolicies.enforceSingleActiveSubscription,
      ),
      prorationMode:
        (subscriptionPolicies.prorationMode as PlatformProrationMode) ?? "NEXT_CYCLE",
    },
    governanceGuardrails: {
      strictQuotaEnforcement: Boolean(governanceGuardrails.strictQuotaEnforcement),
      blockOnExpiredSubscription: Boolean(governanceGuardrails.blockOnExpiredSubscription),
      allowReadOnlyDuringGracePeriod: Boolean(
        governanceGuardrails.allowReadOnlyDuringGracePeriod,
      ),
    },
    updatedAt: String(source.updatedAt ?? ""),
  };
}

function normalizeFeatureFlag(value: unknown): PlatformFeatureFlag {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    name: String(source.name ?? ""),
    enabled: Boolean(source.enabled),
    rolloutPercentage: toNumber(source.rolloutPercentage, 0),
    allowedCompanies: Array.isArray(source.allowedCompanies)
      ? source.allowedCompanies.map((entry) => String(entry))
      : [],
    blockedCompanies: Array.isArray(source.blockedCompanies)
      ? source.blockedCompanies.map((entry) => String(entry))
      : [],
    description: String(source.description ?? ""),
    createdAt: String(source.createdAt ?? ""),
    lastModified: String(source.lastModified ?? ""),
  };
}

export const platformSettingsApi = {
  async getSettings(): Promise<PlatformSettings> {
    const response = await httpClient.get(API_ENDPOINTS.platform.settings);
    return normalizeSettings(unwrapEnvelope(response.data));
  },

  async updateSettings(payload: UpdatePlatformSettingsRequest): Promise<PlatformSettings> {
    const response = await httpClient.patch(API_ENDPOINTS.platform.settings, payload);
    return normalizeSettings(unwrapEnvelope(response.data));
  },

  async getFeatureFlags(): Promise<PlatformFeatureFlag[]> {
    const response = await httpClient.get(API_ENDPOINTS.platform.featureFlags);
    const data = unwrapEnvelope<unknown[]>(response.data);
    return Array.isArray(data) ? data.map(normalizeFeatureFlag) : [];
  },

  async createFeatureFlag(payload: CreateFeatureFlagRequest): Promise<PlatformFeatureFlag> {
    const response = await httpClient.post(API_ENDPOINTS.platform.featureFlags, payload);
    return normalizeFeatureFlag(unwrapEnvelope(response.data));
  },

  async updateFeatureFlag(
    name: string,
    payload: UpdateFeatureFlagRequest,
  ): Promise<PlatformFeatureFlag> {
    const response = await httpClient.patch(API_ENDPOINTS.platform.featureFlag(name), payload);
    return normalizeFeatureFlag(unwrapEnvelope(response.data));
  },
};
