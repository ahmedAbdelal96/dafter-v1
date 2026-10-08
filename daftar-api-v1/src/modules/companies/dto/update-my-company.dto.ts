import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Length } from 'class-validator';

export class UpdateMyCompanyDto {
  @ApiPropertyOptional({ description: 'Company display name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Company phone number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Company address', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code (3 letters)', maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;
}
