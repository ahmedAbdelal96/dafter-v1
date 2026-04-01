// ============================================================
// DTO: Query Schedule (استعلام جدول الأقساط المستحقة)
// ============================================================
//
// يُستخدم لعرض الأقساط المستحقة خلال فترة زمنية.
// dateFrom و dateTo مطلوبان لمنع استعلامات بدون حدود.
//
// الاستخدام النموذجي: "الأقساط المستحقة هذا الشهر"
//   GET /installments/schedule?dateFrom=2026-03-01&dateTo=2026-03-31
// ============================================================

import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleStatus } from '@prisma/client';

export class QueryScheduleDto {
  /** تاريخ بداية الفترة — مطلوب */
  @ApiProperty({
    description: 'تاريخ بداية الفترة (YYYY-MM-DD) — مطلوب',
    example: '2026-03-01',
  })
  @IsDateString(
    {},
    { message: 'dateFrom يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'dateFrom مطلوب' })
  dateFrom: string;

  /** تاريخ نهاية الفترة — مطلوب */
  @ApiProperty({
    description: 'تاريخ نهاية الفترة (YYYY-MM-DD) — مطلوب',
    example: '2026-03-31',
  })
  @IsDateString(
    {},
    { message: 'dateTo يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'dateTo مطلوب' })
  dateTo: string;

  /**
   * فلترة حسب حالة الأقساط — القيمة الافتراضية: PENDING, PARTIAL, OVERDUE
   * يمكن إرسال قيم متعددة: ?status=PENDING&status=OVERDUE
   */
  @ApiPropertyOptional({
    description:
      'فلترة حسب حالة الأقساط (يمكن اختيار أكثر من حالة). الافتراضي: PENDING, PARTIAL, OVERDUE',
    enum: ScheduleStatus,
    isArray: true,
    example: [ScheduleStatus.PENDING, ScheduleStatus.OVERDUE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ScheduleStatus, { each: true, message: 'حالة القسط غير صالحة' })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: ScheduleStatus[] = [
    ScheduleStatus.PENDING,
    ScheduleStatus.PARTIAL,
    ScheduleStatus.OVERDUE,
  ];

  /** رقم الصفحة */
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

  /** عدد السجلات في الصفحة */
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
