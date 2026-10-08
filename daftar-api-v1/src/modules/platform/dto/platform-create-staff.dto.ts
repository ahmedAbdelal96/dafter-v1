import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateStaffDto } from '../../users/dto/create-staff.dto';

export class PlatformCreateStaffDto extends CreateStaffDto {
  @ApiProperty({
    description: 'Company ID (tenant scope)',
    format: 'uuid',
  })
  @IsUUID()
  companyId: string;
}

