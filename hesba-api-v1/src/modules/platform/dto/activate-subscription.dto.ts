// ============================================
// ActivateSubscriptionDto — Platform Super Admin
// ============================================
// Used to activate or upgrade a company's subscription to a paid plan

import {
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivateSubscriptionDto {
  @ApiProperty({
    description: 'معرف الشركة (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الشركة غير صالح' })
  @IsNotEmpty({ message: 'معرف الشركة مطلوب' })
  companyId: string;

  @ApiProperty({
    description: 'معرف الخطة الجديدة (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'معرف الخطة غير صالح' })
  @IsNotEmpty({ message: 'معرف الخطة مطلوب' })
  planId: string;

  @ApiProperty({
    description: 'تاريخ انتهاء الاشتراك الجديد',
    example: '2027-02-21',
  })
  @IsDateString({}, { message: 'تاريخ انتهاء الاشتراك غير صالح' })
  @IsNotEmpty({ message: 'تاريخ انتهاء الاشتراك مطلوب' })
  endDate: string;

  @ApiPropertyOptional({
    description: 'تجديد تلقائي',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({
    description: 'ملاحظة على التفعيل',
    example: 'تم الدفع يدوياً',
  })
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({
    description:
      'Idempotency key fallback in body when Idempotency-Key header is absent',
    example: '6a4a857b-b90b-47dc-a232-7a98dca9b70d',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
