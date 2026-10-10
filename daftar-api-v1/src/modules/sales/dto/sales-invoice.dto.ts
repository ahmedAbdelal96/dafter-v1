import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { SalesDiscountType, SalesInvoiceStatus } from '@prisma/client';

export class SalesInvoiceLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsString()
  quantity!: string;

  @IsString()
  unitPrice!: string;

  @IsEnum(SalesDiscountType)
  discountType: SalesDiscountType = SalesDiscountType.NONE;

  @IsString()
  discountValue = '0';

  @IsOptional()
  @IsUUID()
  taxRateId?: string;

  @IsOptional()
  @IsUUID()
  taxTreatmentId?: string;
}

export class CreateSalesInvoiceDto {
  @IsUUID()
  businessPartnerId!: string;

  @IsDateString()
  documentDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @IsString()
  exchangeRate!: string;

  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceLineDto)
  lines!: SalesInvoiceLineDto[];
}

export class UpdateSalesInvoiceDto extends CreateSalesInvoiceDto {}

export class SalesInvoiceQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SalesInvoiceStatus)
  status?: SalesInvoiceStatus;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsDateString()
  documentDateFrom?: string;

  @IsOptional()
  @IsDateString()
  documentDateTo?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['1', '2', '3', '4', '5', '10', '20', '25', '50', '100'])
  limit?: string;

  @IsOptional()
  @IsString()
  page?: string;
}

export type SalesInvoiceLineInput = {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: SalesDiscountType;
  discountValue?: string;
  taxRateId?: string;
  taxTreatmentId?: string;
};

export type CreateSalesInvoiceInput = {
  businessPartnerId: string;
  documentDate: Date;
  currencyCode?: string;
  exchangeRate: string;
  paymentTermId?: string;
  customerReference?: string;
  notes?: string;
  lines: SalesInvoiceLineInput[];
  claimedGrandTotal?: string;
};

export type SalesInvoiceQuery = {
  search?: string;
  status?: SalesInvoiceStatus;
  partnerId?: string;
  documentDateFrom?: Date;
  documentDateTo?: Date;
  currencyCode?: string;
  page?: number;
  limit?: number;
};
