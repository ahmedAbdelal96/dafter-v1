import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PaginationQueryDto,
} from '../../../common/dto';
import {
  TaxCalculationMode,
  TaxLifecycleStatus,
  TaxModuleKey,
  TaxRegistrationStatus,
  TaxSetupReadinessStatus,
  TaxTreatmentCategory,
} from '@prisma/client';

const booleanTransform = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class TaxSetupQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term', example: 'VAT' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by lifecycle status', enum: TaxLifecycleStatus })
  @IsOptional()
  @IsEnum(TaxLifecycleStatus)
  status?: TaxLifecycleStatus;

  @ApiPropertyOptional({ description: 'Active records only', example: true })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Include archived records', example: false })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  includeArchived?: boolean;
}

export class CreateTaxRegistrationProfileDto {
  @ApiProperty({ example: 'EG', description: 'ISO country code' })
  @IsString()
  @MaxLength(2)
  countryCode: string;

  @ApiPropertyOptional({ example: 'EG-VAT', description: 'Optional tax regime code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  regimeCode?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'VAT registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatRegistrationNumber?: string;

  @ApiPropertyOptional({ example: 'Daftar Trading LLC', description: 'Legal tax name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalTaxName?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Registration effective date' })
  @IsOptional()
  @IsDateString()
  registrationEffectiveDate?: string;

  @ApiPropertyOptional({ example: '123 Tax Street', description: 'Tax address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taxAddressLine1?: string;

  @ApiPropertyOptional({ example: 'Suite 4', description: 'Tax address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taxAddressLine2?: string;

  @ApiPropertyOptional({ example: 'Cairo', description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Cairo Governorate', description: 'Region / governorate' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: '11511', description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ enum: TaxRegistrationStatus, example: TaxRegistrationStatus.REGISTERED })
  @IsOptional()
  @IsEnum(TaxRegistrationStatus)
  vatRegistrationStatus?: TaxRegistrationStatus;

  @ApiPropertyOptional({ enum: TaxSetupReadinessStatus, example: TaxSetupReadinessStatus.READY })
  @IsOptional()
  @IsEnum(TaxSetupReadinessStatus)
  readinessStatus?: TaxSetupReadinessStatus;

  @ApiPropertyOptional({ example: 'Main tax setup note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateTaxRegistrationProfileDto extends PartialType(CreateTaxRegistrationProfileDto) {}

export class TaxRateSearchQueryDto extends TaxSetupQueryDto {}

export class CreateTaxRateDto {
  @ApiProperty({ example: 'VAT_STANDARD', description: 'Unique code (case-insensitive)' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Standard VAT 15%', description: 'Display name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 15, description: 'Tax percentage', minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  percentage: number;

  @ApiPropertyOptional({ enum: TaxLifecycleStatus, example: TaxLifecycleStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TaxLifecycleStatus)
  status?: TaxLifecycleStatus;

  @ApiPropertyOptional({ enum: TaxTreatmentCategory, example: TaxTreatmentCategory.STANDARD })
  @IsOptional()
  @IsEnum(TaxTreatmentCategory)
  category?: TaxTreatmentCategory;

  @ApiPropertyOptional({ description: 'Linked tax treatment ID' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  treatmentId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 'Default sales VAT rate' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {}

export class CreateTaxTreatmentDto {
  @ApiProperty({ example: 'STANDARD_TAXABLE' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Standard taxable' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: TaxTreatmentCategory, example: TaxTreatmentCategory.STANDARD })
  @IsEnum(TaxTreatmentCategory)
  category: TaxTreatmentCategory;

  @ApiProperty({ enum: TaxCalculationMode, example: TaxCalculationMode.TAX_EXCLUSIVE })
  @IsEnum(TaxCalculationMode)
  calculationMode: TaxCalculationMode;

  @ApiPropertyOptional({ example: 'Normal taxable supply' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ enum: TaxLifecycleStatus, example: TaxLifecycleStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TaxLifecycleStatus)
  status?: TaxLifecycleStatus;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateTaxTreatmentDto extends PartialType(CreateTaxTreatmentDto) {}

export class UpdateTaxDefaultPolicyDto {
  @ApiPropertyOptional({ enum: TaxCalculationMode, example: TaxCalculationMode.TAX_EXCLUSIVE })
  @IsOptional()
  @IsEnum(TaxCalculationMode)
  defaultCalculationMode?: TaxCalculationMode;

  @ApiPropertyOptional({ description: 'Default rate ID' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultRateId?: string | null;

  @ApiPropertyOptional({ description: 'Default treatment ID' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultTreatmentId?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  allowManualOverride?: boolean;

  @ApiPropertyOptional({ example: 'Default policy note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateTaxAccountBindingDto {
  @ApiPropertyOptional({ example: 'TAX_PAYABLE' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxPayableAccountCode?: string | null;

  @ApiPropertyOptional({ example: 'INPUT_TAX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recoverableTaxAccountCode?: string | null;

  @ApiPropertyOptional({ example: 'OUTPUT_TAX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  outputTaxAccountCode?: string | null;

  @ApiPropertyOptional({ example: 'INPUT_TAX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  inputTaxAccountCode?: string | null;

  @ApiPropertyOptional({ example: 'ROUNDING_TAX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roundingAccountCode?: string | null;

  @ApiPropertyOptional({ example: 'Binding note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateTaxModuleApplicabilityRuleDto {
  @ApiPropertyOptional({ enum: TaxModuleKey })
  @IsOptional()
  @IsEnum(TaxModuleKey)
  moduleKey?: TaxModuleKey;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  allowOverride?: boolean;

  @ApiPropertyOptional({ description: 'Default rate ID' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultRateId?: string | null;

  @ApiPropertyOptional({ description: 'Default treatment ID' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultTreatmentId?: string | null;

  @ApiPropertyOptional({ example: 'Rule note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
