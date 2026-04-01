import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Generic API Response Wrapper
 * يتوافق مع الـ Frontend ApiResponse<T> interface
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({
    example: true,
    description: 'حالة النجاح',
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'البيانات المرجعة',
  })
  data?: T;

  @ApiPropertyOptional({
    example: 'Operation completed successfully',
    description: 'رسالة النجاح أو الخطأ',
  })
  message?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'تفاصيل الخطأ إن وجد',
  })
  error?: string | null;

  @ApiProperty({
    example: '2025-12-01T20:00:00.000Z',
    description: 'الوقت',
  })
  timestamp: string;

  constructor(data?: T, message?: string, error?: string | null) {
    this.success = !error;
    this.data = data;
    this.message = message;
    this.error = error || null;
    this.timestamp = new Date().toISOString();
  }
}
