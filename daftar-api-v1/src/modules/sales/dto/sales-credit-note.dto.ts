import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SalesCreditNoteStatus } from '@prisma/client';

export class SalesCreditNoteLineDto {
  @IsUUID()
  originalSalesInvoiceLineId!: string;

  @IsString()
  quantity!: string;
}

export class CreateSalesCreditNoteDto {
  @IsUUID()
  salesInvoiceId!: string;

  @IsDateString()
  documentDate!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesCreditNoteLineDto)
  lines!: SalesCreditNoteLineDto[];
}

export class SalesCreditNoteQueryDto {
  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsEnum(SalesCreditNoteStatus)
  status?: SalesCreditNoteStatus;
}

export type SalesCreditNoteLineInput = {
  originalSalesInvoiceLineId: string;
  quantity: string;
};

export type CreateSalesCreditNoteInput = {
  salesInvoiceId: string;
  documentDate: Date;
  reason: string;
  lines: SalesCreditNoteLineInput[];
};

export type SalesCreditNoteQuery = {
  salesInvoiceId?: string;
  partnerId?: string;
  status?: SalesCreditNoteStatus;
};
