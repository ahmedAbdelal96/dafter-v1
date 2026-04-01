import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PlatformResetUserCredentialsDto {
  @ApiProperty({
    description: 'Company ID (tenant scope)',
    format: 'uuid',
  })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({
    description:
      'Preferred delivery channel. If omitted, backend picks email first, then WhatsApp.',
    enum: ['email', 'whatsapp'],
  })
  @IsOptional()
  @IsIn(['email', 'whatsapp'])
  channel?: 'email' | 'whatsapp';

  @ApiPropertyOptional({
    description: 'Optional reason for resetting credentials',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
