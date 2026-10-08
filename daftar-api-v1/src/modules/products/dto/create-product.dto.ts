// ============================================================
// CreateProductDto — Validate incoming product creation payload
// ============================================================

import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'اسم المنتج أو الخدمة',
    example: 'كيس أرز 50 كيلو',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم المنتج مطلوب' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'وصف تفصيلي للمنتج أو الخدمة',
    example: 'أرز مصري فاخر درجة أولى، معبأ في أكياس 50 كيلو',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'كود المنتج (SKU) — يجب أن يكون فريداً داخل الشركة',
    example: 'RICE-50KG-001',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    description: 'تصنيف المنتج (نص حر)',
    example: 'مواد غذائية',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'وحدة القياس (قطعة / كيلو / متر / خدمة / إلخ)',
    example: 'كيلو',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({
    description: 'سعر الوحدة',
    example: 350.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'سعر الوحدة يجب أن يكون رقماً بحد أقصى خانتين عشريتين' })
  @Min(0, { message: 'سعر الوحدة لا يمكن أن يكون سالباً' })
  @Type(() => Number)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'هل المنتج نشط (يظهر في الكتالوج)؟',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
