// Only DRAFT invoices can be updated.
// Allows replacing all line-items + optional header fields (notes, issueDate, taxAmount).

import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceItemDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'Replace all line items', type: [InvoiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  @ArrayMinSize(1)
  items?: InvoiceItemDto[];

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: 14.0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
