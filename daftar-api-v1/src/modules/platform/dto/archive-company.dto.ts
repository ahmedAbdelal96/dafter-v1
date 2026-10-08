import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArchiveCompanyDto {
  @ApiPropertyOptional({
    description: 'Optional reason for archiving this company',
    example: 'Tenant requested temporary suspension',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

