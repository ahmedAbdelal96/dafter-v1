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
import { CustomerPaymentMethod, CustomerPaymentStatus } from '@prisma/client';

const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;
const RATE = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;

export class CustomerPaymentAllocationDto {
  @IsUUID()
  journalLineId!: string;

  @IsOptional()
  @IsUUID()
  salesInvoicePaymentScheduleId?: string;

  @Matches(DECIMAL)
  amount!: string;
}

export class CreateCustomerPaymentDto {
  @IsUUID()
  businessPartnerId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsEnum(CustomerPaymentMethod)
  method!: CustomerPaymentMethod;

  @IsUUID()
  destinationAccountId!: string;

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
  @MaxLength(128)
  idempotencyKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerPaymentAllocationDto)
  allocations!: CustomerPaymentAllocationDto[];
}

export class UpdateCustomerPaymentDto extends CreateCustomerPaymentDto {}

export class PostCustomerPaymentDto {
  @IsDateString()
  postingDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class ReverseCustomerPaymentDto {
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

export class CreateARReconciliationDto {
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

export class ReverseARReconciliationDto {
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

export class CustomerPaymentQueryDto {
  @IsOptional()
  @IsEnum(CustomerPaymentStatus)
  status?: CustomerPaymentStatus;

  @IsOptional()
  @IsUUID()
  businessPartnerId?: string;
}

export type CustomerPaymentAllocationInput = {
  journalLineId: string;
  salesInvoicePaymentScheduleId?: string;
  amount: string;
};

export type CustomerPaymentInput = Omit<
  CreateCustomerPaymentDto,
  'allocations' | 'paymentDate'
> & {
  paymentDate: Date;
  allocations: CustomerPaymentAllocationInput[];
};
