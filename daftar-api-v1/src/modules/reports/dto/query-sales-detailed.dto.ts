import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartyType, SaleType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySalesDetailedDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  @IsOptional()
  @IsUUID('4')
  createdById?: string;

  @ApiPropertyOptional({ enum: SaleType, example: SaleType.CASH })
  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  @ApiPropertyOptional({ example: 'INV-2026' })
  @IsOptional()
  @IsString()
  search?: string;
}

