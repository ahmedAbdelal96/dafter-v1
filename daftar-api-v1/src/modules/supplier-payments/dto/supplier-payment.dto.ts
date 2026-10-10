import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SupplierPaymentMethod, SupplierPaymentStatus } from '@prisma/client';

const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;
const RATE = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;

export class SupplierPaymentAllocationDto {
  @IsUUID()
  journalLineId!: string;

  @IsOptional()
  @IsUUID()
  supplierInvoicePaymentScheduleId?: string;

  @Matches(DECIMAL)
  amount!: string;
}

export class CreateSupplierPaymentDto {
  @IsUUID()
  businessPartnerId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsEnum(SupplierPaymentMethod)
  method!: SupplierPaymentMethod;

  @IsUUID()
  sourceAccountId!: string;

  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  transactionCurrencyCode!: string;

  @Matches(RATE)
  exchangeRate!: string;

  @Matches(DECIMAL)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierPaymentAllocationDto)
  allocations!: SupplierPaymentAllocationDto[];
}

export class UpdateSupplierPaymentDto extends CreateSupplierPaymentDto {}

export class PostSupplierPaymentDto {
  @IsDateString()
  postingDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class ReverseSupplierPaymentDto {
  @IsDateString()
  postingDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class ReconcileOnAccountDto {
  @IsUUID()
  journalLineId!: string;

  @Matches(DECIMAL)
  amount!: string;

  @IsOptional()
  @IsDateString()
  postingDate?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class CreateAPReconciliationDto {
  @IsUUID()
  debitJournalLineId!: string;

  @IsUUID()
  creditJournalLineId!: string;

  @Matches(DECIMAL)
  amount!: string;

  @IsDateString()
  postingDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class ReverseAPReconciliationDto {
  @IsDateString()
  postingDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class SupplierPaymentQueryDto {
  @IsOptional()
  @IsEnum(SupplierPaymentStatus)
  status?: SupplierPaymentStatus;

  @IsOptional()
  @IsUUID()
  businessPartnerId?: string;
}

export type SupplierPaymentAllocationInput = {
  journalLineId: string;
  supplierInvoicePaymentScheduleId?: string;
  amount: string;
};

export type SupplierPaymentInput = Omit<
  CreateSupplierPaymentDto,
  'allocations' | 'paymentDate'
> & {
  paymentDate: Date;
  allocations: SupplierPaymentAllocationInput[];
};
