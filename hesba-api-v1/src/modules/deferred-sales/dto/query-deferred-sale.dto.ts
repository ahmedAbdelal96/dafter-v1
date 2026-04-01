// ============================================================
// DTO: Query Deferred Sales (استعلام قائمة البيوع الآجلة)
// ============================================================
// يُمثّل معاملات الاستعلام والتصفية لقائمة البيوع الآجلة.
// يرث من PaginationQueryDto لدعم الصفحات والترتيب.
// ============================================================

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeferredSaleStatus, PartyType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto';

export class QueryDeferredSaleDto extends PaginationQueryDto {
  /**
   * تصفية حسب نوع الطرف (اختياري)
   */
  @ApiPropertyOptional({
    description: 'تصفية حسب نوع الطرف',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(PartyType, { message: 'نوع الطرف غير صالح' })
  partyType?: PartyType;

  /**
   * تصفية حسب معرف الطرف (اختياري)
   */
  @ApiPropertyOptional({
    description: 'تصفية حسب UUID الطرف (عميل / مورد / موظف)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'معرف الطرف يجب أن يكون UUID صالح' })
  partyId?: string;

  /**
   * تصفية حسب حالة البيع الآجل (اختياري)
   */
  @ApiPropertyOptional({
    description: 'تصفية حسب حالة البيع الآجل',
    enum: DeferredSaleStatus,
    example: DeferredSaleStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(DeferredSaleStatus, { message: 'حالة البيع الآجل غير صالحة' })
  status?: DeferredSaleStatus;

  /**
   * تصفية حسب تاريخ البداية (YYYY-MM-DD) — يُطبَّق على dueDate (اختياري)
   */
  @ApiPropertyOptional({
    description: 'تاريخ بداية الفترة (YYYY-MM-DD) — يُصفي حسب تاريخ الاستحقاق',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateFrom يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dateFrom?: string;

  /**
   * تصفية حسب تاريخ النهاية (YYYY-MM-DD) — يُطبَّق على dueDate (اختياري)
   */
  @ApiPropertyOptional({
    description: 'تاريخ نهاية الفترة (YYYY-MM-DD) — يُصفي حسب تاريخ الاستحقاق',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateTo يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dateTo?: string;

  /**
   * بحث نصي في referenceNumber أو description (اختياري)
   */
  @ApiPropertyOptional({
    description: 'بحث نصي في رقم المرجع أو الوصف',
    example: 'DEF-2024',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'نص البحث يجب أن يكون نصاً' })
  @MaxLength(200, { message: 'نص البحث لا يتجاوز 200 حرف' })
  search?: string;
}
