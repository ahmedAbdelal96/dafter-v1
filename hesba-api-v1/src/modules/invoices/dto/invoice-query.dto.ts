import { IsOptional, IsEnum, IsUUID, IsDateString, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType, InvoiceStatus, InvoicePaymentStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto';
import { Transform } from 'class-transformer';

/**
 * Query/filter parameters for GET /invoices
 * Extends PaginationQueryDto (page, limit, sortBy, sortOrder)
 */
export class InvoiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'تصفية حسب حالة الفاتورة',
    enum: InvoiceStatus,
    example: InvoiceStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'تصفية حسب نوع الطرف',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @ApiPropertyOptional({
    description: 'تصفية فواتير طرف معين (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional({
    description: 'من تاريخ (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'إلى تاريخ (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'بحث برقم الفاتورة أو اسم الطرف',
    example: 'INV-2026',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // B9.1 — added paymentStatus filter
  @ApiPropertyOptional({
    description: 'تصفية حسب حالة الدفع',
    enum: InvoicePaymentStatus,
    example: InvoicePaymentStatus.UNPAID,
  })
  @IsOptional()
  @IsEnum(InvoicePaymentStatus)
  paymentStatus?: InvoicePaymentStatus;

  // B9.1 — show only invoices generated from a deferred sale
  @ApiPropertyOptional({
    description: 'عرض فواتير البيع الآجل فقط',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  deferredOnly?: boolean;
}
