import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PlatformCompanyScopeDto {
  @ApiProperty({
    description: 'Company ID (tenant scope)',
    format: 'uuid',
  })
  @IsUUID()
  companyId: string;
}

