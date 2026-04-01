import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum PlatformProrationMode {
  NONE = 'NONE',
  IMMEDIATE = 'IMMEDIATE',
  NEXT_CYCLE = 'NEXT_CYCLE',
}

export class PlatformTrialDefaultsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  @IsOptional()
  @IsBoolean()
  autoActivateOnSignup?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCompanyPhone?: boolean;
}

export class PlatformSubscriptionPoliciesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  gracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  allowPlanDowngrade?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPlanUpgrade?: boolean;

  @IsOptional()
  @IsBoolean()
  enforceSingleActiveSubscription?: boolean;

  @IsOptional()
  @IsEnum(PlatformProrationMode)
  prorationMode?: PlatformProrationMode;
}

export class PlatformGovernanceGuardrailsDto {
  @IsOptional()
  @IsBoolean()
  strictQuotaEnforcement?: boolean;

  @IsOptional()
  @IsBoolean()
  blockOnExpiredSubscription?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReadOnlyDuringGracePeriod?: boolean;
}

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformTrialDefaultsDto)
  trialDefaults?: PlatformTrialDefaultsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformSubscriptionPoliciesDto)
  subscriptionPolicies?: PlatformSubscriptionPoliciesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformGovernanceGuardrailsDto)
  governanceGuardrails?: PlatformGovernanceGuardrailsDto;
}

export class CreatePlatformFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9._-]+$/i, {
    message:
      'feature name can contain only letters, numbers, dot, underscore, and dash',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  description: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;
}

export class UpdatePlatformFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string;
}
