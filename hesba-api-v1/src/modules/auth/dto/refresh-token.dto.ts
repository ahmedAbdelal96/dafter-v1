import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO: تجديد التوكن
 *
 * Business:
 * - يستقبل الـ refresh token الحالي
 * - يرجع access token + refresh token جديدين
 * - الـ refresh token القديم يتلغى فوراً (rotation)
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'الـ Refresh Token الحالي',
  })
  @IsNotEmpty({ message: 'التوكن مطلوب' })
  @IsString()
  refreshToken: string;
}
