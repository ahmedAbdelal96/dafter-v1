import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'Updated company name',
    example: 'Acme Trading LLC',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Updated company phone',
    example: '+201234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companyPhone?: string;

  @ApiPropertyOptional({
    description: 'Updated company address',
    example: 'Cairo, Egypt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyAddress?: string;

  @ApiPropertyOptional({
    description: 'Currency code (3 letters)',
    example: 'EGP',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}

