import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteCompanyDto {
  @ApiProperty({
    description:
      'Safety confirmation: must exactly match the current company name',
    example: 'Acme Trading LLC',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  confirmCompanyName!: string;

  @ApiPropertyOptional({
    description: 'Optional reason for permanent deletion',
    example: 'Tenant requested GDPR erasure',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

