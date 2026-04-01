import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType } from '@prisma/client';

export class StandalonePaymentDto {
  @ApiProperty({ enum: PartyType, description: 'Party type (CUSTOMER / SUPPLIER / EMPLOYEE)' })
  @IsEnum(PartyType)
  partyType: PartyType;

  @ApiProperty({ description: 'Party UUID' })
  @IsUUID()
  partyId: string;

  @ApiProperty({ example: 750.0, description: 'Payment amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999)
  amount: number;

  @ApiPropertyOptional({
    example: '2026-03-13',
    description: 'Payment date (ISO 8601). Defaults to today.',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'دفع نقدي — فاتورة مارس' })
  @IsOptional()
  @IsString()
  note?: string;
}
