import { ApiProperty } from '@nestjs/swagger';
import { CashReconciliationMode } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCashReconciliationModeDto {
  @ApiProperty({
    enum: CashReconciliationMode,
    example: CashReconciliationMode.SIMPLE_DAILY,
  })
  @IsEnum(CashReconciliationMode)
  mode!: CashReconciliationMode;
}

