// ============================================================
// DTO: Record Installment Payment (تسجيل دفعة قسط)
// ============================================================
//
// يُرسَل مع: POST /installments/contracts/:contractId/payments
//
// المبلغ (amount) يجب:
//   - أن يكون أكبر من صفر
//   - أن لا يتجاوز المتبقي من القسط المحدد (تُتحقق منه في Use Case)
// ============================================================

import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordInstallmentPaymentDto {
  /** معرف القسط المراد تسجيل الدفعة عليه */
  @ApiProperty({
    description: 'معرف القسط (UUID) — يجب أن ينتمي للعقد المحدد',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'معرف القسط يجب أن يكون UUID صالح' })
  @IsNotEmpty({ message: 'معرف القسط مطلوب' })
  scheduleId: string;

  /** مبلغ الدفعة — يجب ألا يتجاوز المتبقي من القسط */
  @ApiProperty({
    description:
      'مبلغ الدفعة — يجب أن يكون أكبر من صفر ولا يتجاوز المتبقي من القسط',
    example: 500.0,
    minimum: 0.01,
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'مبلغ الدفعة يجب أن يكون رقماً' },
  )
  @Min(0.01, { message: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' })
  @Max(99999999999.99, {
    message: 'مبلغ الدفعة يتجاوز الحد الأقصى المسموح به',
  })
  @Type(() => Number)
  amount: number;

  /** تاريخ الدفعة الفعلية */
  @ApiProperty({
    description: 'تاريخ الدفعة (YYYY-MM-DD)',
    example: '2026-03-15',
  })
  @IsDateString(
    {},
    { message: 'تاريخ الدفعة يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'تاريخ الدفعة مطلوب' })
  paymentDate: string;

  /** طريقة الدفع (نقدي / تحويل / شيك ...) */
  @ApiPropertyOptional({
    description: 'طريقة الدفع',
    example: 'نقدي',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'طريقة الدفع لا تتجاوز 100 حرف' })
  paymentMethod?: string;

  /** ملاحظات إضافية */
  @ApiPropertyOptional({
    description: 'ملاحظات على الدفعة',
    example: 'دفعة جزئية بموجب اتفاق شفهي',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات لا تتجاوز 500 حرف' })
  notes?: string;
}
