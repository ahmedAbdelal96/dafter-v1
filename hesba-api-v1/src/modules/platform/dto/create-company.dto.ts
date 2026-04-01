import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CreateCompanyDto
 *
 * Supports two subscription setup styles:
 * 1) Duration-based (preferred):
 *    - trialDays (trial flow)
 *    - termMonths (paid flow: 1/3/6/12)
 * 2) Explicit end date (legacy compatibility):
 *    - subscriptionEndDate
 */
export class CreateCompanyDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Al Amal Trading',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم الشركة مطلوب' })
  @MaxLength(200)
  companyName: string;

  @ApiPropertyOptional({
    description: 'Company phone',
    example: '+201234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companyPhone?: string;

  @ApiPropertyOptional({
    description: 'Company address',
    example: 'Cairo, Egypt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyAddress?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'EGP',
    default: 'EGP',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiProperty({
    description: 'Owner full name',
    example: 'Mohamed Ahmed Ali',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم المالك مطلوب' })
  @MaxLength(200)
  ownerFullName: string;

  @ApiProperty({
    description: 'Owner email',
    example: 'owner@company.com',
  })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  ownerEmail: string;

  @ApiProperty({
    description:
      'Owner initial password (must include uppercase letter and number)',
    example: 'TempPass123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(8, {
    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
  })
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير ورقم على الأقل',
  })
  ownerPassword: string;

  @ApiPropertyOptional({
    description: 'Owner phone',
    example: '+201234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ownerPhone?: string;

  @ApiProperty({
    description: 'Plan ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الخطة غير صالح' })
  @IsNotEmpty({ message: 'معرف الخطة مطلوب' })
  planId: string;

  @ApiPropertyOptional({
    description:
      'Trial duration in days. If sent, company starts in TRIAL status.',
    example: 14,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;

  @ApiPropertyOptional({
    description:
      'Paid term duration in months. Supported terms: 1, 3, 6, 12.',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  termMonths?: number;

  @ApiPropertyOptional({
    description:
      'Explicit custom end date (legacy compatibility). Overrides trialDays/termMonths when provided.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ انتهاء الاشتراك غير صالح' })
  subscriptionEndDate?: string;

  @ApiPropertyOptional({
    description: 'Auto renew subscription',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
