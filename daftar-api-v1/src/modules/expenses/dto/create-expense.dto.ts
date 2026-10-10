import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category: ExpenseCategory;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  /** ISO date string — e.g. "2024-03-15" */
  @IsString()
  @IsNotEmpty()
  expenseDate: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  /** Receipt or vendor invoice number */
  @IsString()
  @MaxLength(100)
  @IsOptional()
  referenceNumber?: string;

  /** Cash / bank-transfer / cheque / etc. */
  @IsString()
  @MaxLength(100)
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
