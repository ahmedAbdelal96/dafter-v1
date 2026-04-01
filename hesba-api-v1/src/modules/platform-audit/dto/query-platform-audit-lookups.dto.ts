import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryPlatformAuditLookupsDto {
  @ApiPropertyOptional({
    description: 'Search company list by name',
    example: 'alpha',
  })
  @IsOptional()
  @IsString()
  companySearch?: string;

  @ApiPropertyOptional({
    description: 'Search actor list by full name or email',
    example: 'owner@company.com',
  })
  @IsOptional()
  @IsString()
  actorSearch?: string;

  @ApiPropertyOptional({
    description: 'Scope actor/action/entity lookups by company ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Maximum options per lookup group',
    default: 30,
    minimum: 5,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  limit?: number = 30;
}

