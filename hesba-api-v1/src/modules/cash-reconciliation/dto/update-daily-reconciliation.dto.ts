import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateDailyReconciliationDto {
  @ApiProperty({ required: false, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingCash?: number;

  @ApiProperty({ required: false, example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashSalesOutsideSystem?: number;

  @ApiProperty({ required: false, example: 140 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashExpensesOutsideSystem?: number;

  @ApiProperty({ required: false, example: 1560 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualCashCounted?: number;

  @ApiProperty({ required: false, example: 'Adjusted after recount' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  note?: string;
}

