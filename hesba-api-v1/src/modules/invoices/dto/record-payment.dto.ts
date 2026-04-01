import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty({ example: 500.0, description: 'Payment amount (must be > 0)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999)
  amount: number;

  @ApiPropertyOptional({ example: 'دفع نقدي', description: 'Optional payment note' })
  @IsOptional()
  @IsString()
  note?: string;
}
