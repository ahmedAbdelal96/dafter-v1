import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  PurchaseAccountType,
  PurchaseOrderStatus,
  SalesDiscountType,
  SupplierCreditNoteStatus,
  SupplierInvoiceStatus,
} from '@prisma/client';

export class PurchaseLineDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsString() @MaxLength(500) description!: string;
  @IsString() quantity!: string;
  @IsString() unitPrice!: string;
  @IsOptional() @IsEnum(SalesDiscountType) discountType?: SalesDiscountType;
  @IsOptional() @IsString() discountValue?: string;
  @IsOptional() @IsUUID() taxRateId?: string;
  @IsOptional() @IsUUID() taxTreatmentId?: string;
  @IsOptional() @IsEnum(PurchaseAccountType) accountType?: PurchaseAccountType;
  @IsOptional() @IsUUID() expenseAccountId?: string;
  @IsOptional() @IsUUID() assetAccountId?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID() businessPartnerId!: string;
  @IsDateString() documentDate!: string;
  @IsOptional() @IsDateString() requestedDeliveryDate?: string;
  @IsOptional() @IsString() @MaxLength(3) currencyCode?: string;
  @IsString() exchangeRate!: string;
  @IsOptional() @IsUUID() paymentTermId?: string;
  @IsOptional() @IsString() @MaxLength(120) supplierReference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines!: PurchaseLineDto[];
}

export class UpdatePurchaseOrderDto extends CreatePurchaseOrderDto {}

export class CreateSupplierInvoiceDto extends CreatePurchaseOrderDto {
  @IsOptional() @IsUUID() purchaseOrderId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateSupplierInvoiceDto extends CreateSupplierInvoiceDto {}

export class PostDocumentDto {
  @IsDateString() postingDate!: string;
  @IsString() @IsNotEmpty() @MaxLength(128) idempotencyKey!: string;
}

export class CreateSupplierCreditNoteDto {
  @IsUUID() supplierInvoiceId!: string;
  @IsDateString() documentDate!: string;
  @IsString() @MaxLength(1000) reason!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierCreditLineDto)
  lines!: SupplierCreditLineDto[];
}

export class SupplierCreditLineDto {
  @IsUUID() originalSupplierInvoiceLineId!: string;
  @IsString() quantity!: string;
}

export class UpdateSupplierCreditNoteDto extends CreateSupplierCreditNoteDto {}

export class PurchaseQueryDto {
  @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;
  @IsOptional()
  @IsEnum(SupplierInvoiceStatus)
  invoiceStatus?: SupplierInvoiceStatus;
  @IsOptional()
  @IsEnum(SupplierCreditNoteStatus)
  creditNoteStatus?: SupplierCreditNoteStatus;
  @IsOptional() @IsUUID() businessPartnerId?: string;
}

export type PurchaseLineInput = {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: SalesDiscountType;
  discountValue?: string;
  taxRateId?: string;
  taxTreatmentId?: string;
  accountType?: PurchaseAccountType;
  expenseAccountId?: string;
  assetAccountId?: string;
};
