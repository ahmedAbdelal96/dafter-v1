import { Injectable, Logger } from '@nestjs/common';

/**
 * Feature Flags Service — Centralized feature flag management
 *
 * Supports: master switch, gradual rollout, per-company whitelist/blacklist.
 * Flags are in-memory for simplicity; move to DB/Redis for persistence.
 */

export interface FeatureFlag {
  enabled: boolean;
  rolloutPercentage: number;
  allowedCompanies: string[];
  blockedCompanies: string[];
  description: string;
  createdAt: Date;
  lastModified: Date;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  private flags = new Map<string, FeatureFlag>();

  /** Check if feature is enabled (optionally for a specific company) */
  isEnabled(featureName: string, companyId?: string): boolean {
    const flag = this.flags.get(featureName);

    if (!flag) {
      this.logger.warn(
        `Feature flag "${featureName}" not found. Defaulting to false.`,
      );
      return false;
    }

    if (!flag.enabled) return false;

    if (companyId) {
      if (
        flag.allowedCompanies.length > 0 &&
        flag.allowedCompanies.includes(companyId)
      ) {
        return true;
      }
      if (flag.blockedCompanies.includes(companyId)) {
        return false;
      }
    }

    if (flag.rolloutPercentage < 100) {
      const hash = this.hashString(companyId || 'anonymous');
      return hash % 100 < flag.rolloutPercentage;
    }

    return true;
  }

  /** Register a new feature flag */
  register(name: string, description: string, enabled = false): void {
    this.flags.set(name, {
      enabled,
      rolloutPercentage: enabled ? 100 : 0,
      allowedCompanies: [],
      blockedCompanies: [],
      description,
      createdAt: new Date(),
      lastModified: new Date(),
    });
    this.logger.log(`Feature flag registered: "${name}" (enabled=${enabled})`);
  }

  /** Enable feature flag */
  enable(featureName: string, rolloutPercentage = 100): void {
    const flag = this.flags.get(featureName);
    if (!flag) return;
    flag.enabled = true;
    flag.rolloutPercentage = Math.min(Math.max(rolloutPercentage, 0), 100);
    flag.lastModified = new Date();
    this.logger.log(
      `Feature "${featureName}" ENABLED (${flag.rolloutPercentage}% rollout)`,
    );
  }

  /** Disable feature flag (instant rollback) */
  disable(featureName: string): void {
    const flag = this.flags.get(featureName);
    if (!flag) return;
    flag.enabled = false;
    flag.lastModified = new Date();
    this.logger.warn(`Feature "${featureName}" DISABLED`);
  }

  /** Get all flags (for admin dashboard) */
  getAllFlags(): Map<string, FeatureFlag> {
    return new Map(this.flags);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
