// ============================================
// DTO: Ledger Statement Query (استعلام كشف الحساب)
// ============================================
// يُجلب كشف حساب طرف واحد (عميل / مورد / موظف)
// مع Running Balance لكل سطر.
//
// تصميم:
//   - partyType + partyId: مطلوبان (تحديد الطرف)
//   - dateFrom / dateTo: اختيارية (تصفية بالفترة)
//   - page / limit: تصفح بالصفحات
//   - الترتيب مثبت: entryDate ASC ثم createdAt ASC (ترتيب زمني دائماً)
//     لا نسمح للمستخدم بتغيير الترتيب في كشف الحساب
//     (الكشف المحاسبي يجب أن يكون زمنياً).
// ============================================

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType } from '@prisma/client';

export class LedgerStatementQueryDto {
  @ApiProperty({
    description: 'نوع الطرف',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsEnum(PartyType, { message: 'نوع الطرف غير صالح' })
  partyType: PartyType;

  @ApiProperty({
    description: 'معرف الطرف (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الطرف يجب أن يكون UUID صالح' })
  @IsNotEmpty()
  partyId: string;

  @ApiPropertyOptional({
    description: 'تاريخ بداية الفترة (YYYY-MM-DD) — شامل',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateFrom يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'تاريخ نهاية الفترة (YYYY-MM-DD) — شامل',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateTo يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد السجلات في الصفحة',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
