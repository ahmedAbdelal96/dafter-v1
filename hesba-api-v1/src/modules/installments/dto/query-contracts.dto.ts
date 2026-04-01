// ============================================================
// DTO: Query Contracts (استعلام قائمة العقود)
// ============================================================
//
// يرث PaginationQueryDto (page, limit, sortBy, sortOrder).
// يُضيف فلاتر خاصة بالعقود التقسيطية.
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
import {
  InstallmentStatus,
  PartyType,
  ScheduleStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryContractsDto extends PaginationQueryDto {
  /** فلترة حسب نوع الطرف */
  @ApiPropertyOptional({
    description: 'فلترة حسب نوع الطرف',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(PartyType, { message: 'نوع الطرف غير صالح' })
  partyType?: PartyType;

  /** فلترة حسب معرف الطرف المحدد */
  @ApiPropertyOptional({
    description: 'فلترة حسب معرف الطرف (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'معرف الطرف يجب أن يكون UUID صالح' })
  partyId?: string;

  /** فلترة حسب حالة العقد */
  @ApiPropertyOptional({
    description: 'فلترة حسب حالة العقد',
    enum: InstallmentStatus,
    example: InstallmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(InstallmentStatus, { message: 'حالة العقد غير صالحة' })
  status?: InstallmentStatus;

  /**
   * فلترة حسب حالة الأقساط — مثلاً: OVERDUE لإظهار العقود التي لها أقساط متأخرة
   */
  @ApiPropertyOptional({
    description: 'فلترة العقود التي لها أقساط بحالة معينة (مثل OVERDUE)',
    enum: ScheduleStatus,
    example: ScheduleStatus.OVERDUE,
  })
  @IsOptional()
  @IsEnum(ScheduleStatus, { message: 'حالة القسط غير صالحة' })
  scheduleStatus?: ScheduleStatus;

  /** فلترة حسب تاريخ بداية الفترة (تاريخ إنشاء العقد) */
  @ApiPropertyOptional({
    description: 'تاريخ بداية الفترة (YYYY-MM-DD) — بناءً على تاريخ الإنشاء',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateFrom يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dateFrom?: string;

  /** فلترة حسب تاريخ نهاية الفترة (تاريخ إنشاء العقد) */
  @ApiPropertyOptional({
    description: 'تاريخ نهاية الفترة (YYYY-MM-DD) — بناءً على تاريخ الإنشاء',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateTo يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)' },
  )
  dateTo?: string;

  /** بحث نصي في رقم العقد أو الوصف */
  @ApiPropertyOptional({
    description: 'بحث نصي في رقم العقد أو الوصف',
    example: 'CNT-2026',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'نص البحث لا يتجاوز 100 حرف' })
  search?: string;
}
