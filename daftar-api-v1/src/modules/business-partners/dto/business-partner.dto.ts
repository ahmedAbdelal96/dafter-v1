import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessPartnerAddressType,
  BusinessPartnerType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
  ArrayUnique,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum BusinessPartnerRole {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

const MONEY_PATTERN = /^\d{1,15}(?:\.\d{1,4})?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

export class CustomerProfileInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ example: '10000.00', nullable: true })
  @IsOptional()
  @Matches(MONEY_PATTERN)
  creditLimit?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  receivableAccountId?: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @Matches(CURRENCY_PATTERN)
  preferredCurrencyCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SupplierProfileInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payableAccountId?: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @Matches(CURRENCY_PATTERN)
  preferredCurrencyCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBusinessPartnerDto {
  @ApiProperty({ example: 'BP-001', maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  partnerCode: string;

  @ApiProperty({ enum: BusinessPartnerType })
  @IsEnum(BusinessPartnerType)
  partnerType: BusinessPartnerType;

  @ApiProperty({ example: 'ABC Trading', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  taxRegistrationNumber?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  commercialRegistrationNumber?: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ enum: BusinessPartnerRole, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(BusinessPartnerRole, { each: true })
  roles?: BusinessPartnerRole[];

  @ApiPropertyOptional({ type: CustomerProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerProfileInputDto)
  customerProfile?: CustomerProfileInputDto;

  @ApiPropertyOptional({ type: SupplierProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierProfileInputDto)
  supplierProfile?: SupplierProfileInputDto;
}

export class UpdateBusinessPartnerDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  taxRegistrationNumber?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  commercialRegistrationNumber?: string | null;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string | null;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version: number;
}

export class SetBusinessPartnerActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version: number;
}

export class BusinessPartnerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Code, display/legal name, phone or tax number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BusinessPartnerAddressDto {
  @ApiProperty({ enum: BusinessPartnerAddressType })
  @IsEnum(BusinessPartnerAddressType)
  addressType: BusinessPartnerAddressType;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  line1: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @ApiProperty({ example: 'EG' })
  @Matches(COUNTRY_PATTERN)
  countryCode: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBusinessPartnerAddressDto extends BusinessPartnerAddressDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BusinessPartnerContactDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateBusinessPartnerContactDto extends BusinessPartnerContactDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCustomerProfileDto extends CustomerProfileInputDto {}
export class UpdateSupplierProfileDto extends SupplierProfileInputDto {}
