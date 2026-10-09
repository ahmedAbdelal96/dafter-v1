import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const MONEY = /^\d+(?:\.\d{1,4})?$/;

export class OpeningBalanceLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId: string;

  @ApiProperty({ example: '1000.00' })
  @Matches(MONEY)
  debit: string;

  @ApiProperty({ example: '0.00' })
  @Matches(MONEY)
  credit: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  businessPartnerId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateOpeningBalanceDto {
  @ApiProperty({ format: 'date' })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountingPeriodId: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({ type: OpeningBalanceLineDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningBalanceLineDto)
  lines: OpeningBalanceLineDto[];

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @MaxLength(128)
  idempotencyKey: string;
}

export class ReverseOpeningBalanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountingPeriodId: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  postingDate: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @MaxLength(128)
  idempotencyKey: string;
}
