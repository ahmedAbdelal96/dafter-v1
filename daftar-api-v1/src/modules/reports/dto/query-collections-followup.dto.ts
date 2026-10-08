import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PartyType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum CollectionFlowFilter {
  DEFERRED = 'DEFERRED',
  INSTALLMENT = 'INSTALLMENT',
}

export enum CollectionMetricFilter {
  PAID = 'PAID',
  REMAINING = 'REMAINING',
  OVERDUE = 'OVERDUE',
}

export class QueryCollectionsFollowupDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: PartyType, example: PartyType.CUSTOMER })
  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @ApiPropertyOptional({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  @IsOptional()
  @IsUUID('4')
  partyId?: string;

  @ApiPropertyOptional({ example: 'ahmed' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CollectionFlowFilter, example: CollectionFlowFilter.DEFERRED })
  @IsOptional()
  @IsEnum(CollectionFlowFilter)
  flow?: CollectionFlowFilter;

  @ApiPropertyOptional({ enum: CollectionMetricFilter, example: CollectionMetricFilter.OVERDUE })
  @IsOptional()
  @IsEnum(CollectionMetricFilter)
  metric?: CollectionMetricFilter;
}
