// ============================================
// CreatePlanDto — Platform Super Admin
// ============================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsPositive,
  Min,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @ApiProperty({
    description: 'اسم الخطة (فريد في النظام)',
    example: 'BASIC_MONTHLY',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم الخطة مطلوب' })
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'سعر الخطة',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber({}, { message: 'السعر يجب أن يكون رقماً' })
  @Min(0, { message: 'السعر لا يمكن أن يكون سالباً' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    description: 'رمز العملة',
    example: 'EGP',
    default: 'EGP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiProperty({
    description: 'دورة الفوترة',
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
  })
  @IsEnum(BillingCycle, {
    message: 'دورة الفوترة يجب أن تكون MONTHLY أو YEARLY',
  })
  billingCycle: BillingCycle;

  // ── Limits (null = unlimited) ─────────────────────────────

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد المستخدمين (null = غير محدود)',
    example: 5,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  maxUsers?: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد العملاء (null = غير محدود)',
    example: 200,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  maxCustomers?: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد الموردين (null = غير محدود)',
    example: 100,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  maxSuppliers?: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد الموظفين (null = غير محدود)',
    example: 50,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  maxEmployees?: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد قيود اليومية (null = غير محدود)',
    example: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  maxLedgerEntries?: number;

  @ApiPropertyOptional({
    description: 'قائمة مميزات الخطة',
    example: ['reports', 'exports', 'multi-user'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'هل الخطة متاحة للبيع',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
