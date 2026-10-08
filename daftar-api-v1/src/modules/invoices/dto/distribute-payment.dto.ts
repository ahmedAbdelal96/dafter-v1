import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DistributePaymentDto {
  @ApiProperty({ description: 'Customer ID to distribute payment against' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 1000.0, description: 'Total payment amount to distribute' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999)
  amount: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Specific invoice IDs to pay. If omitted, auto-distributes FIFO (oldest first).',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  invoiceIds?: string[];

  @ApiPropertyOptional({ example: 'تحويل بنكي' })
  @IsOptional()
  @IsString()
  note?: string;
}
