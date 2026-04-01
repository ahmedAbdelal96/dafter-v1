// ============================================================
// DTO: Create Deferred Sale (إنشاء بيع آجل)
// ============================================================
// يُمثّل طلب إنشاء بيع بالأجل (بيع آجل) لطرف معين.
//
// PRECISION NOTE:
//   totalAmount مخزن كـ Decimal(14,2) في DB.
//   لا تستخدم العمليات الحسابية في JavaScript على المبالغ المالية.
// ============================================================

import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateDeferredSaleDto {
  /**
   * نوع الطرف (عميل / مورد / موظف)
   */
  @ApiProperty({
    description: 'نوع الطرف المرتبط بالبيع الآجل',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsEnum(PartyType, { message: 'نوع الطرف غير صالح' })
  partyType: PartyType;

  /**
   * معرف الطرف (UUID) — العميل أو المورد أو الموظف
   */
  @ApiProperty({
    description: 'UUID الطرف (عميل / مورد / موظف) — يجب أن يكون موجوداً في الشركة',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الطرف يجب أن يكون UUID صالح' })
  @IsNotEmpty({ message: 'معرف الطرف مطلوب' })
  partyId: string;

  /**
   * المبلغ الإجمالي للبيع الآجل — يجب أن يكون موجباً
   */
  @ApiProperty({
    description: 'المبلغ الإجمالي للبيع الآجل (يجب أن يكون أكبر من صفر)',
    example: 5000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'المبلغ الإجمالي يجب أن يكون رقماً' },
  )
  @Min(0.01, { message: 'المبلغ الإجمالي يجب أن يكون أكبر من صفر' })
  totalAmount: number;

  /**
   * تاريخ الاستحقاق (YYYY-MM-DD) — الموعد المتوقع للسداد الكامل
   */
  @ApiProperty({
    description: 'تاريخ الاستحقاق (YYYY-MM-DD)',
    example: '2024-03-15',
  })
  @IsDateString(
    {},
    { message: 'تاريخ الاستحقاق يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'تاريخ الاستحقاق مطلوب' })
  dueDate: string;

  /**
   * وصف البيع الآجل (اختياري)
   */
  @ApiPropertyOptional({
    description: 'وصف المبيع أو ملاحظات إضافية',
    example: 'بضاعة أقمشة — فاتورة رقم INV-2024-001',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصاً' })
  @MaxLength(500, { message: 'الوصف لا يتجاوز 500 حرف' })
  description?: string;

  /**
   * طريقة الدفع المتوقعة (اختياري)
   */
  @ApiPropertyOptional({
    description: 'طريقة الدفع المتوقعة (نقد / تحويل / شيك ...)',
    example: 'تحويل بنكي',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'طريقة الدفع يجب أن تكون نصاً' })
  @MaxLength(100, { message: 'طريقة الدفع لا تتجاوز 100 حرف' })
  expectedPaymentMethod?: string;

  /**
   * تاريخ الحركة (اختياري — الافتراضي: اليوم)
   */
  @ApiPropertyOptional({
    description: 'تاريخ تسجيل الحركة (YYYY-MM-DD) — الافتراضي: اليوم',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'تاريخ الحركة يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  entryDate?: string;
}
