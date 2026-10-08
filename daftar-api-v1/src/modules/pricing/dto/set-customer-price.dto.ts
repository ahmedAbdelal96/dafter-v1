import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SetCustomerPriceDto {
  @ApiProperty({ example: 49.99, description: 'Negotiated price for this customer' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9_999_999_999.99)
  price: number;
}
