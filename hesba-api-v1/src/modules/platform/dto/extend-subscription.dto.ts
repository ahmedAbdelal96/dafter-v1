// ============================================
// ExtendSubscriptionDto — Platform Super Admin
// ============================================

import {
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtendSubscriptionDto {
  @ApiProperty({
    description: 'معرف الشركة (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الشركة غير صالح' })
  @IsNotEmpty({ message: 'معرف الشركة مطلوب' })
  companyId: string;

  @ApiProperty({
    description: 'تاريخ انتهاء الاشتراك الجديد',
    example: '2027-06-30',
  })
  @IsDateString({}, { message: 'تاريخ الانتهاء الجديد غير صالح' })
  @IsNotEmpty({ message: 'تاريخ الانتهاء الجديد مطلوب' })
  newEndDate: string;

  @ApiPropertyOptional({
    description: 'سبب التمديد (للسجل الداخلي)',
    example: 'تعويض بسبب مشكلة تقنية',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Idempotency key fallback in body when Idempotency-Key header is absent',
    example: 'e0f72ec9-8257-4010-b1b3-9247fd6d3749',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
