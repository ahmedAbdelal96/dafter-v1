import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTermLineType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const MONEY_PATTERN = /^\d{1,15}(?:\.\d{1,4})?$/;

export class PaymentTermLineDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiProperty({ enum: PaymentTermLineType })
  @IsEnum(PaymentTermLineType)
  calculationType: PaymentTermLineType;

  @ApiPropertyOptional({ example: '50.0000', nullable: true })
  @IsOptional()
  @Matches(MONEY_PATTERN)
  percentage?: string | null;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dueDays: number;
}

export class CreatePaymentTermDto {
  @ApiProperty({ example: 'NET-30', maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 'Net 30 days', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: PaymentTermLineDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentTermLineDto)
  lines: PaymentTermLineDto[];
}

export class UpdatePaymentTermDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ type: PaymentTermLineDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentTermLineDto)
  lines?: PaymentTermLineDto[];
}

export class SetPaymentTermActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class PaymentTermQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CalculatePaymentTermDto {
  @ApiProperty({ example: '1250.00' })
  @Matches(MONEY_PATTERN)
  amount: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  documentDate: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
}
