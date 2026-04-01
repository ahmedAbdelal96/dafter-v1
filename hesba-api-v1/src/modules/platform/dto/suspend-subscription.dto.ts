// ============================================
// SuspendSubscriptionDto — Platform Super Admin
// ============================================

import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendSubscriptionDto {
  @ApiProperty({
    description: 'معرف الشركة (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الشركة غير صالح' })
  @IsNotEmpty({ message: 'معرف الشركة مطلوب' })
  companyId: string;

  @ApiPropertyOptional({
    description: 'سبب الإيقاف (للسجل الداخلي)',
    example: 'عدم السداد',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Idempotency key fallback in body when Idempotency-Key header is absent',
    example: '8d1eae08-9805-4a0c-b6c0-ef7fe2ae1cd5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
