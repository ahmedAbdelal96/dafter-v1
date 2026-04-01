import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChangePlanMode {
  IMMEDIATE = 'IMMEDIATE',
}

export class ChangePlanDto {
  @ApiProperty({
    description: 'Company UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    description: 'Target plan UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4')
  @IsNotEmpty()
  newPlanId: string;

  @ApiPropertyOptional({
    description: 'Change mode. Only IMMEDIATE is supported in this phase.',
    enum: ChangePlanMode,
    default: ChangePlanMode.IMMEDIATE,
  })
  @IsOptional()
  @IsEnum(ChangePlanMode)
  mode?: ChangePlanMode;

  @ApiPropertyOptional({
    description: 'Optional audit reason',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Idempotency key fallback in body when Idempotency-Key header is absent',
    example: 'a96c4f24-f9ec-4f80-b0c2-c31111f2e7f4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

