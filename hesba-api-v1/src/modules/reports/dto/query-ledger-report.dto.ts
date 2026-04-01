import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PartyType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryLedgerReportDto extends PaginationQueryDto {
  @ApiProperty({
    enum: PartyType,
    example: PartyType.CUSTOMER,
    description: 'Party type for ledger statement',
  })
  @IsEnum(PartyType)
  partyType: PartyType;

  @ApiProperty({
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    description: 'Party id for ledger statement',
  })
  @IsUUID('4')
  partyId: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

