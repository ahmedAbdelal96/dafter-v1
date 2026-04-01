import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum DebtEntityType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export enum DebtBalanceType {
  RECEIVABLE = 'RECEIVABLE',
  PAYABLE = 'PAYABLE',
}

export class QueryDebtsSummaryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DebtEntityType, example: DebtEntityType.CUSTOMER })
  @IsOptional()
  @IsEnum(DebtEntityType)
  entityType?: DebtEntityType;

  @ApiPropertyOptional({ enum: DebtBalanceType, example: DebtBalanceType.RECEIVABLE })
  @IsOptional()
  @IsEnum(DebtBalanceType)
  balanceType?: DebtBalanceType;

  @ApiPropertyOptional({ example: 'ahmed' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;
}

