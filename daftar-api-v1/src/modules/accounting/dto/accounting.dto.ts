import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AccountingAccountType,
  AccountingJournalType,
  AccountingPeriodStatus,
  FiscalYearStatus,
  JournalEntryStatus,
  JournalSourceType,
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
} from '@prisma/client';

const MONEY = /^-?(?:\d+)(?:\.\d+)?$/;

export class CreateAccountingAccountDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(AccountingAccountType as Record<string, string>)
  accountType!: AccountingAccountType;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  allowDirectPosting?: boolean;

  @IsOptional()
  @IsBoolean()
  isControlAccount?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  reconciliationEligible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAccountingAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  allowDirectPosting?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isControlAccount?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string | null;

  @IsOptional()
  @IsBoolean()
  reconciliationEligible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateAccountingJournalDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(AccountingJournalType as Record<string, string>)
  type!: AccountingJournalType;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAccountingJournalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateFiscalYearDto {
  @IsString()
  @MaxLength(40)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateFiscalYearStatusDto {
  @IsEnum(FiscalYearStatus as Record<string, string>)
  status!: FiscalYearStatus;
}

export class CreateAccountingPeriodDto {
  @IsUUID()
  fiscalYearId!: string;

  @IsString()
  @MaxLength(80)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateAccountingPeriodStatusDto {
  @IsEnum(AccountingPeriodStatus as Record<string, string>)
  status!: AccountingPeriodStatus;
}

export class CreateAccountingConfigurationDto {
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  baseCurrencyCode!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  reportingCurrencyCode?: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsString()
  @MaxLength(20)
  localeCode!: string;
}

export class JournalLineDto {
  @IsUUID()
  accountId!: string;

  @IsString()
  @Matches(MONEY)
  transactionDebit!: string;

  @IsString()
  @Matches(MONEY)
  transactionCredit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  businessPartnerId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reconciliationReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxTreatmentCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\d+)(?:\.\d+)?$/)
  taxRate?: string;
}

export class ManualJournalEntryDto {
  @IsUUID()
  journalId!: string;

  @IsUUID()
  accountingPeriodId!: string;

  @IsDateString()
  postingDate!: string;

  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  transactionCurrencyCode!: string;

  @IsString()
  @Matches(/^(?:\d+)(?:\.\d+)?$/)
  exchangeRate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentReference?: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  /** Required by the service when posting into a SOFT_CLOSED period. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  periodOverrideReason?: string;

  @IsString()
  @MaxLength(128)
  idempotencyKey!: string;

  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

/** @deprecated Use ManualJournalEntryDto for the public manual-journal API. */
export class PostJournalEntryDto extends ManualJournalEntryDto {}

export class SetAccountingAccountDefaultDto {
  @IsEnum(AccountingConfigAccountKey as Record<string, string>)
  settingKey!: AccountingConfigAccountKey;

  @IsUUID()
  accountId!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class SetAccountingJournalDefaultDto {
  @IsEnum(AccountingConfigJournalKey as Record<string, string>)
  settingKey!: AccountingConfigJournalKey;

  @IsUUID()
  journalId!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ReverseJournalEntryDto {
  @IsUUID()
  accountingPeriodId!: string;

  @IsDateString()
  postingDate!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class AccountingEntryQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  journalId?: string;

  @IsOptional()
  @IsUUID()
  accountingPeriodId?: string;

  @IsOptional()
  @IsEnum(JournalSourceType as Record<string, string>)
  sourceType?: JournalSourceType;

  @IsOptional()
  @IsString()
  @IsEnum(JournalEntryStatus as Record<string, string>)
  status?: JournalEntryStatus;
}
