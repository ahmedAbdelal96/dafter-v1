import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import {
  FeatureFlag,
  FeatureFlagsService,
} from '../../common/feature-flags/feature-flags.service';
import {
  CreatePlatformFeatureFlagDto,
  PlatformProrationMode,
  UpdatePlatformFeatureFlagDto,
  UpdatePlatformSettingsDto,
} from './dto/platform-settings.dto';

const PLATFORM_SETTINGS_CACHE_NAMESPACE = 'platform';
const PLATFORM_SETTINGS_CACHE_KEY = 'settings';
const PLATFORM_FEATURE_FLAGS_CACHE_KEY = 'feature-flags';

export interface PlatformSettingsSnapshot {
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

export interface PlatformFeatureFlagSnapshot {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedCompanies: string[];
  blockedCompanies: string[];
  description: string;
  createdAt: string;
  lastModified: string;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsSnapshot = {
  trialDefaults: {
    durationDays: 14,
    autoActivateOnSignup: true,
    requireCompanyPhone: false,
  },
  subscriptionPolicies: {
    gracePeriodDays: 3,
    allowPlanDowngrade: true,
    allowPlanUpgrade: true,
    enforceSingleActiveSubscription: true,
    prorationMode: PlatformProrationMode.NEXT_CYCLE,
  },
  governanceGuardrails: {
    strictQuotaEnforcement: true,
    blockOnExpiredSubscription: true,
    allowReadOnlyDuringGracePeriod: true,
  },
  updatedAt: new Date(0).toISOString(),
};

@Injectable()
export class PlatformSettingsService {
  private featureFlagsHydrated = false;

  constructor(
    private readonly cacheService: CacheService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async getSettings(): Promise<PlatformSettingsSnapshot> {
    const cached = await this.cacheService.get<PlatformSettingsSnapshot>(
      PLATFORM_SETTINGS_CACHE_KEY,
      PLATFORM_SETTINGS_CACHE_NAMESPACE,
    );

    if (cached) {
      return cached;
    }

    const seeded = {
      ...DEFAULT_PLATFORM_SETTINGS,
      updatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(
      PLATFORM_SETTINGS_CACHE_KEY,
      seeded,
      {
        namespace: PLATFORM_SETTINGS_CACHE_NAMESPACE,
        // Persist indefinitely in Redis unless updated explicitly.
        ttl: 0,
      },
    );

    return seeded;
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    const current = await this.getSettings();

    const next: PlatformSettingsSnapshot = {
      trialDefaults: {
        ...current.trialDefaults,
        ...(dto.trialDefaults ?? {}),
      },
      subscriptionPolicies: {
        ...current.subscriptionPolicies,
        ...(dto.subscriptionPolicies ?? {}),
      },
      governanceGuardrails: {
        ...current.governanceGuardrails,
        ...(dto.governanceGuardrails ?? {}),
      },
      updatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(
      PLATFORM_SETTINGS_CACHE_KEY,
      next,
      {
        namespace: PLATFORM_SETTINGS_CACHE_NAMESPACE,
        ttl: 0,
      },
    );

    return next;
  }

  async getFeatureFlags(): Promise<PlatformFeatureFlagSnapshot[]> {
    await this.ensureFeatureFlagsHydrated();
    const flags = this.featureFlagsService.getAllFlags();

    return Array.from(flags.entries())
      .map(([name, flag]) => this.toFeatureFlag(name, flag))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFeatureFlag(
    dto: CreatePlatformFeatureFlagDto,
  ): Promise<PlatformFeatureFlagSnapshot> {
    await this.ensureFeatureFlagsHydrated();
    const flags = this.featureFlagsService.getAllFlags();
    if (flags.has(dto.name)) {
      throw new BadRequestException('Feature flag already exists');
    }

    const enabled = dto.enabled ?? false;
    this.featureFlagsService.register(dto.name, dto.description, enabled);

    if (enabled) {
      this.featureFlagsService.enable(dto.name, dto.rolloutPercentage ?? 100);
    }

    const created = this.featureFlagsService.getAllFlags().get(dto.name);
    if (!created) {
      throw new BadRequestException('Failed to create feature flag');
    }

    if (!enabled && dto.rolloutPercentage != null) {
      created.rolloutPercentage = dto.rolloutPercentage;
      created.lastModified = new Date();
    }

    await this.persistFeatureFlags();
    return this.toFeatureFlag(dto.name, created);
  }

  async updateFeatureFlag(
    name: string,
    dto: UpdatePlatformFeatureFlagDto,
  ): Promise<PlatformFeatureFlagSnapshot> {
    await this.ensureFeatureFlagsHydrated();
    const flags = this.featureFlagsService.getAllFlags();
    const current = flags.get(name);

    if (!current) {
      throw new NotFoundException('Feature flag not found');
    }

    if (dto.enabled != null) {
      if (dto.enabled) {
        this.featureFlagsService.enable(name, dto.rolloutPercentage ?? current.rolloutPercentage);
      } else {
        this.featureFlagsService.disable(name);
      }
    }

    const next = this.featureFlagsService.getAllFlags().get(name);
    if (!next) {
      throw new NotFoundException('Feature flag not found');
    }

    if (dto.rolloutPercentage != null) {
      if (dto.enabled === false) {
        throw new BadRequestException(
          'Cannot set rolloutPercentage while disabling a feature flag in the same request',
        );
      }

      next.rolloutPercentage = dto.rolloutPercentage;
      next.lastModified = new Date();
    }

    if (dto.description) {
      next.description = dto.description;
      next.lastModified = new Date();
    }

    await this.persistFeatureFlags();
    return this.toFeatureFlag(name, next);
  }

  private async ensureFeatureFlagsHydrated() {
    if (this.featureFlagsHydrated) return;

    this.featureFlagsHydrated = true;
    try {
      const cachedFlags = await this.cacheService.get<PlatformFeatureFlagSnapshot[]>(
        PLATFORM_FEATURE_FLAGS_CACHE_KEY,
        PLATFORM_SETTINGS_CACHE_NAMESPACE,
      );
      if (!cachedFlags || cachedFlags.length === 0) return;

      const currentFlags = this.featureFlagsService.getAllFlags();

      for (const cachedFlag of cachedFlags) {
        if (!currentFlags.has(cachedFlag.name)) {
          this.featureFlagsService.register(
            cachedFlag.name,
            cachedFlag.description,
            cachedFlag.enabled,
          );
        }

        const target = this.featureFlagsService.getAllFlags().get(cachedFlag.name);
        if (!target) continue;

        target.enabled = cachedFlag.enabled;
        target.rolloutPercentage = cachedFlag.rolloutPercentage;
        target.description = cachedFlag.description;
        target.allowedCompanies = [...cachedFlag.allowedCompanies];
        target.blockedCompanies = [...cachedFlag.blockedCompanies];
        target.createdAt = new Date(cachedFlag.createdAt);
        target.lastModified = new Date(cachedFlag.lastModified);
      }
    } catch {
      // Non-critical: platform can still run with in-memory defaults.
    }
  }

  private async persistFeatureFlags() {
    const flags = this.featureFlagsService.getAllFlags();
    const payload = Array.from(flags.entries()).map(([name, flag]) =>
      this.toFeatureFlag(name, flag),
    );

    await this.cacheService.set(
      PLATFORM_FEATURE_FLAGS_CACHE_KEY,
      payload,
      {
        namespace: PLATFORM_SETTINGS_CACHE_NAMESPACE,
        ttl: 0,
      },
    );
  }

  private toFeatureFlag(
    name: string,
    flag: FeatureFlag,
  ): PlatformFeatureFlagSnapshot {
    return {
      name,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      allowedCompanies: [...flag.allowedCompanies],
      blockedCompanies: [...flag.blockedCompanies],
      description: flag.description,
      createdAt: flag.createdAt.toISOString(),
      lastModified: flag.lastModified.toISOString(),
    };
  }
}
