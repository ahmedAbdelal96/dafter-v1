// ============================================
// CompanyQueryDto — Platform list/search
// ============================================

import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SubscriptionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CompanyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'بحث بالاسم أو رقم الهاتف',
    example: 'شركة الأمل',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب حالة الاشتراك',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'تصفية حسب حالة الشركة (فعال / موقوف)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Include archived companies in list results',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Return archived companies only',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  archivedOnly?: boolean;
}
