// ============================================================
// DTO: Create Installment Contract (إنشاء عقد تقسيط)
// ============================================================
//
// يدعم نوعين من الجداول:
//   FIXED  — النظام يولّد الأقساط تلقائياً بمبالغ متساوية
//   CUSTOM — المستخدم يحدد كل قسط بتاريخ ومبلغ مخصص
//
// PRECISION NOTE:
//   كل المبالغ تُخزّن كـ Decimal(14,2) في DB.
//   لا تستخدم العمليات الحسابية في JavaScript — استخدم Prisma.Decimal.
// ============================================================

import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType, ScheduleType } from '@prisma/client';

// ── Nested DTO: جدول قسط مخصص (CUSTOM) ────────────────────────────────────

export class InstallmentScheduleItemDto {
  /** تاريخ استحقاق القسط (YYYY-MM-DD) */
  @ApiProperty({
    description: 'تاريخ استحقاق القسط (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsDateString(
    {},
    { message: 'تاريخ الاستحقاق يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'تاريخ الاستحقاق مطلوب' })
  dueDate: string;

  /** مبلغ هذا القسط */
  @ApiProperty({
    description: 'مبلغ القسط — يجب أن يكون أكبر من صفر',
    example: 500.0,
    minimum: 0.01,
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'مبلغ القسط يجب أن يكون رقماً' },
  )
  @Min(0.01, { message: 'مبلغ القسط يجب أن يكون أكبر من صفر' })
  @Max(99999999999.99, { message: 'مبلغ القسط يتجاوز الحد الأقصى المسموح به' })
  @Type(() => Number)
  amount: number;

  /** ملاحظة اختيارية على هذا القسط */
  @ApiPropertyOptional({
    description: 'ملاحظة على هذا القسط',
    example: 'قسط شهر أبريل',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'ملاحظة القسط لا تتجاوز 255 حرف' })
  notes?: string;
}

// ── Main DTO ────────────────────────────────────────────────────────────────

export class CreateContractDto {
  // ── Party (الطرف) ──────────────────────────────────────────

  @ApiProperty({
    description: 'نوع الطرف (عميل / مورد / موظف)',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsEnum(PartyType, { message: 'نوع الطرف غير صالح' })
  partyType: PartyType;

  @ApiProperty({
    description: 'معرف الطرف (UUID) — يجب أن يكون موجوداً في الشركة',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'معرف الطرف يجب أن يكون UUID صالح' })
  @IsNotEmpty()
  partyId: string;

  // ── Amounts (المبالغ) ───────────────────────────────────────

  @ApiProperty({
    description: 'إجمالي قيمة العقد (بما فيه الدفعة المقدمة)',
    example: 10000.0,
    minimum: 0.01,
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'إجمالي المبلغ يجب أن يكون رقماً' },
  )
  @Min(0.01, { message: 'إجمالي المبلغ يجب أن يكون أكبر من صفر' })
  @Max(99999999999.99, {
    message: 'إجمالي المبلغ يتجاوز الحد الأقصى المسموح به',
  })
  @Type(() => Number)
  totalAmount: number;

  @ApiPropertyOptional({
    description: 'الدفعة المقدمة — تُطرح من إجمالي المبلغ لحساب الدين',
    example: 2000.0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'الدفعة المقدمة يجب أن تكون رقماً' },
  )
  @Min(0, { message: 'الدفعة المقدمة لا يمكن أن تكون سالبة' })
  @Max(99999999999.99, {
    message: 'الدفعة المقدمة تتجاوز الحد الأقصى المسموح به',
  })
  @Type(() => Number)
  downPayment?: number = 0;

  // ── Installment Settings (إعدادات التقسيط) ──────────────────

  @ApiProperty({
    description: 'عدد الأقساط',
    example: 12,
    minimum: 1,
    maximum: 360,
  })
  @IsInt({ message: 'عدد الأقساط يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'عدد الأقساط يجب أن يكون على الأقل 1' })
  @Max(360, { message: 'عدد الأقساط لا يمكن أن يتجاوز 360' })
  @Type(() => Number)
  numberOfInstallments: number;

  @ApiProperty({
    description:
      'نوع جدول الأقساط: FIXED = متساوية تلقائية، CUSTOM = مخصصة يدوياً',
    enum: ScheduleType,
    example: ScheduleType.FIXED,
  })
  @IsEnum(ScheduleType, { message: 'نوع الجدول غير صالح' })
  scheduleType: ScheduleType;

  @ApiProperty({
    description:
      'تاريخ أول قسط (YYYY-MM-DD) — يُستخدم في FIXED لحساب تواريخ الأقساط',
    example: '2026-03-01',
  })
  @IsDateString(
    {},
    {
      message:
        'تاريخ أول قسط يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)',
    },
  )
  @IsNotEmpty({ message: 'تاريخ أول قسط مطلوب' })
  startDate: string;

  // ── Custom Schedule Items (جدول مخصص — مطلوب عند scheduleType = CUSTOM) ──

  @ApiPropertyOptional({
    description:
      'قائمة الأقساط المخصصة — مطلوبة عند scheduleType = CUSTOM.' +
      ' يجب أن يساوي مجموع المبالغ (totalAmount - downPayment) بفارق ±0.01.',
    type: [InstallmentScheduleItemDto],
  })
  @ValidateIf((o) => o.scheduleType === ScheduleType.CUSTOM)
  @IsArray({ message: 'جدول الأقساط يجب أن يكون قائمة' })
  @ValidateNested({ each: true })
  @Type(() => InstallmentScheduleItemDto)
  scheduleItems?: InstallmentScheduleItemDto[];

  // ── Description (وصف) ──────────────────────────────────────

  @ApiPropertyOptional({
    description: 'وصف العقد أو ملاحظة',
    example: 'عقد بيع بالتقسيط — ثلاجة موديل XYZ',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الوصف لا يتجاوز 500 حرف' })
  description?: string;
}
