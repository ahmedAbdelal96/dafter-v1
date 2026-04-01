import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { UserQueryDto } from '../../users/dto/user-query.dto';

export class PlatformUserQueryDto extends UserQueryDto {
  @ApiProperty({
    description: 'Company ID (tenant scope)',
    format: 'uuid',
  })
  @IsUUID()
  companyId: string;
}

