// ============================================================
// CreateInvoiceDto + InvoiceItemDto
// ============================================================
//
// Two ways to add a line-item (both handled by the same DTO):
//
//  [A] From catalog  — send productId; fill description + unitPrice
//      automatically in the frontend, but the DTO snapshot values govern
//      what gets stored (price may differ from catalog for special deals).
//
//  [B] Free text     — omit productId; fill description + unitPrice manually.
//
// The backend accepts both: it only validates productId belongs to the
// company when provided, then stores description/quantity/unitPrice as a
// permanent snapshot regardless of catalog changes.
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType } from '@prisma/client';

// ── Line-item ─────────────────────────────────────────────────────────────────

export class InvoiceItemDto {
  /**
   * Optional catalog reference.
   * When provided, the backend verifies the product belongs to this company.
   * The snapshot (description + unitPrice) is still taken from the DTO fields
   * — not forced from the catalog — allowing the merchant to override prices
   * per invoice (e.g. bulk discount, special deal).
   */
  @ApiPropertyOptional({
    description: 'معرف المنتج من الكتالوج (اختياري — لأغراض التتبع فقط)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'وصف البند أو الصنف',
    example: 'كيس أرز 50 كيلو',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'وصف البند مطلوب' })
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'الكمية (تدعم الكسور لحد 3 منازل عشرية)',
    example: 2,
    minimum: 0.001,
  })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'الكمية يجب أن تكون رقماً حتى 3 منازل عشرية' },
  )
  @Min(0.001, { message: 'الكمية يجب أن تكون أكبر من صفر' })
  quantity: number;

  @ApiProperty({
    description: 'سعر الوحدة',
    example: 350.0,
    minimum: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'سعر الوحدة يجب أن يكون رقماً حتى منزلتين عشريتين' },
  )
  @Min(0, { message: 'سعر الوحدة لا يمكن أن يكون سالباً' })
  unitPrice: number;
}

// ── Invoice header ────────────────────────────────────────────────────────────

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'نوع الطرف (عميل / مورد)',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsEnum(PartyType)
  partyType: PartyType;

  @ApiProperty({
    description: 'معرف الطرف (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  partyId: string;

  @ApiPropertyOptional({
    description: 'عنوان الطرف (يُحفظ كـ snapshot في الفاتورة)',
    example: '١٢ شارع النيل، وسط البلد، القاهرة',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  partyAddress?: string;

  @ApiProperty({
    description: 'بنود الفاتورة (بند واحد على الأقل)',
    type: [InvoiceItemDto],
    example: [
      { description: 'كيس أرز 50 كيلو', quantity: 2, unitPrice: 350.0 },
      { description: 'شحن بضاعة للإسكندرية', quantity: 1, unitPrice: 200.0 },
    ],
  })
  @IsArray({ message: 'بنود الفاتورة يجب أن تكون قائمة' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  @ArrayMinSize(1, { message: 'يجب إضافة بند واحد على الأقل' })
  items: InvoiceItemDto[];

  @ApiPropertyOptional({
    description: 'مبلغ الضريبة (ضريبة القيمة المضافة أو أي ضريبة أخرى)',
    example: 14.0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'الضريبة يجب أن تكون رقماً حتى منزلتين عشريتين' },
  )
  @Min(0, { message: 'الضريبة لا يمكن أن تكون سالبة' })
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'ملاحظات إضافية تظهر على الفاتورة',
    example: 'يُرجى السداد خلال 30 يوماً من تاريخ الاستلام',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: 'تاريخ إصدار الفاتورة (YYYY-MM-DD)',
    example: '2026-02-23',
  })
  @IsDateString({}, { message: 'تاريخ الإصدار يجب أن يكون بصيغة YYYY-MM-DD' })
  issueDate: string;
}
