// ============================================
// DTO: Create Ledger Entry (تسجيل حركة مالية)
// ============================================
// كل حركة مالية = سجل واحد في LedgerEntry.
//
// signedAmount — قاعدة الإشارة (الـ Client هو المسؤول):
//   Customer → INVOICE: سالب (−500) = دين على العميل
//             PAYMENT: موجب (+500) = سدّاد من العميل
//   Supplier → INVOICE: موجب (+500) = دين لنا عند المورد
//             PAYMENT: سالب (−500) = دفعنا للمورد
//   Employee → ADVANCE: سالب (−200) = سلفة على الموظف
//             SALARY_PAYMENT: موجب (+3000) = دفعنا الراتب
//
// PRECISION NOTE:
//   المبلغ مخزن كـ Decimal(14,2) في DB.
//   لا تُرسل أكثر من رقمين بعد الفاصلة — Prisma يُقرّب تلقائياً.
//   لا تستخدم العمليات الحسابية في JavaScript على المبالغ المالية —
//   استخدم Prisma.Decimal فقط.
// ============================================

import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerEntryType, PartyType } from '@prisma/client';

export class CreateLedgerEntryDto {
  // ── Party (الطرف) ──────────────────────────────────────────
  @ApiProperty({
    description: 'نوع الطرف',
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

  // ── Entry Type (نوع الحركة) ─────────────────────────────────
  @ApiProperty({
    description: 'نوع الحركة المالية',
    enum: LedgerEntryType,
    example: LedgerEntryType.INVOICE,
  })
  @IsEnum(LedgerEntryType, { message: 'نوع الحركة المالية غير صالح' })
  entryType: LedgerEntryType;

  // ── Amount (المبلغ) ─────────────────────────────────────────
  @ApiProperty({
    description: `المبلغ بالإشارة الصحيحة (موجب أو سالب).
      لا يمكن أن يكون صفراً.
      قاعدة الإشارة:
        - INVOICE على العميل: سالب
        - PAYMENT من العميل: موجب
        - INVOICE من المورد: موجب
        - PAYMENT للمورد: سالب`,
    example: -500.0,
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'المبلغ يجب أن يكون رقماً' },
  )
  @NotEquals(0, { message: 'المبلغ لا يمكن أن يكون صفراً' })
  // Decimal(14,2): max 12 integer digits + 2 decimal digits
  @Max(99999999999.99, { message: 'المبلغ يتجاوز الحد الأقصى المسموح به' })
  @Min(-99999999999.99, { message: 'المبلغ يتجاوز الحد الأدنى المسموح به' })
  @Type(() => Number)
  signedAmount: number;

  // ── Dates (التواريخ) ────────────────────────────────────────
  @ApiProperty({
    description: 'تاريخ الحركة (YYYY-MM-DD)',
    example: '2026-02-22',
  })
  @IsDateString(
    {},
    { message: 'تاريخ الحركة يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'تاريخ الحركة مطلوب' })
  entryDate: string;

  @ApiPropertyOptional({
    description:
      'تاريخ الاستحقاق (YYYY-MM-DD) — يجب أن يكون بعد أو مساوياً لتاريخ الحركة',
    example: '2026-03-22',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'تاريخ الاستحقاق يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dueDate?: string;

  // ── Note (ملاحظة) ───────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'ملاحظة أو وصف للحركة',
    example: 'فاتورة رقم 0042 — بضاعة أقمشة',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظة لا تتجاوز 500 حرف' })
  note?: string;
}
