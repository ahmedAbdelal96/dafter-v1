// ============================================
// Register Device Token DTO
// ============================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'Expo push token (format: ExponentPushToken[xxxxxx])',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['ios', 'android', 'web'],
    example: 'android',
  })
  @IsIn(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({
    description: 'Human-readable device name (sent from the app)',
    example: 'Galaxy S24 Ultra',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}
