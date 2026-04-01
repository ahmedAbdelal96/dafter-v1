// ============================================================
// DTO: Record Deferred Payment (تسجيل دفعة على بيع آجل)
// ============================================================
// يُمثّل طلب تسجيل دفعة جزئية أو كاملة على بيع آجل موجود.
//
// قواعد المبلغ:
//   - يجب أن يكون المبلغ > 0
//   - يجب أن لا يتجاوز المبلغ المتبقي (totalAmount - paidAmount)
//   هذا التحقق يتم في الـ Use Case وليس هنا في DTO.
// ============================================================

import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecordDeferredPaymentDto {
  /**
   * مبلغ الدفعة — يجب أن يكون موجباً وأكبر من صفر
   */
  @ApiProperty({
    description: 'مبلغ الدفعة (يجب أن يكون أكبر من صفر ولا يتجاوز المبلغ المتبقي)',
    example: 1500,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'مبلغ الدفعة يجب أن يكون رقماً' },
  )
  @Min(0.01, { message: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' })
  amount: number;

  /**
   * تاريخ الدفعة (YYYY-MM-DD) — الافتراضي: اليوم
   */
  @ApiProperty({
    description: 'تاريخ الدفعة (YYYY-MM-DD) — الافتراضي: اليوم',
    example: '2024-02-01',
  })
  @IsNotEmpty({ message: 'تاريخ الدفعة مطلوب' })
  @IsDateString(
    {},
    { message: 'تاريخ الدفعة يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  paymentDate: string;

  /**
   * طريقة الدفع (اختياري)
   */
  @ApiPropertyOptional({
    description: 'طريقة الدفع (نقد / تحويل بنكي / شيك / محفظة إلكترونية)',
    example: 'تحويل بنكي',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'طريقة الدفع يجب أن تكون نصاً' })
  @MaxLength(100, { message: 'طريقة الدفع لا تتجاوز 100 حرف' })
  paymentMethod?: string;

  /**
   * ملاحظات إضافية على الدفعة (اختياري)
   */
  @ApiPropertyOptional({
    description: 'ملاحظات إضافية على الدفعة',
    example: 'دفعة أولى — رقم الحوالة: TRF-20240201-001',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'الملاحظات يجب أن تكون نصاً' })
  @MaxLength(500, { message: 'الملاحظات لا تتجاوز 500 حرف' })
  notes?: string;
}
