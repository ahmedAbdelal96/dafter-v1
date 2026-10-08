import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { UpdatePermissionsDto } from '../../users/dto/update-permissions.dto';

export class PlatformUpdatePermissionsDto extends UpdatePermissionsDto {
  @ApiProperty({
    description: 'Company ID (tenant scope)',
    format: 'uuid',
  })
  @IsUUID()
  companyId: string;
}

