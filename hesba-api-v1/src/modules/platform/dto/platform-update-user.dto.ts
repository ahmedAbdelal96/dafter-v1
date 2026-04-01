import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { UpdateUserDto } from '../../users/dto/update-user.dto';

export class PlatformUpdateUserDto extends UpdateUserDto {
  @ApiProperty({
    description: 'Company ID (tenant scope)',
    format: 'uuid',
  })
  @IsUUID()
  companyId: string;
}

