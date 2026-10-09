import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitializeCompanyAccountingDto {
  @ApiProperty({ example: 'EG' })
  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @ApiProperty({ example: 'ar-EG' })
  @IsString()
  @MaxLength(20)
  localeCode: string;

  @ApiProperty({ example: 'EGP' })
  @Matches(/^[A-Z]{3}$/)
  baseCurrencyCode: string;

  @ApiProperty({ example: 'EG_STANDARD_V1' })
  @IsString()
  @MaxLength(40)
  templateCode: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  templateVersion: number;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  fiscalYearStart: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  fiscalYearEnd: string;

  @ApiPropertyOptional({
    description: 'Used when the Idempotency-Key header is not supplied',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class ReadinessQueryDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  postingDate?: string;
}
