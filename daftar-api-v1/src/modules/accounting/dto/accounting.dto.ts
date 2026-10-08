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
  PartyType,
} from '@prisma/client';

const MONEY = /^-?(?:\d+)(?:\.\d+)?$/;

export class CreateAccountingAccountDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(AccountingAccountType)
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
}

export class CreateAccountingJournalDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(AccountingJournalType)
  type!: AccountingJournalType;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
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
  @IsEnum(FiscalYearStatus)
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
  @IsEnum(AccountingPeriodStatus)
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
  debit!: string;

  @IsString()
  @Matches(MONEY)
  credit!: string;

  /**
   * Optional transaction-currency amounts. `debit`/`credit` remain the
   * company-currency amounts so source-document adapters can supply both
   * ledgers explicitly without any JavaScript number conversion.
   */
  @IsOptional()
  @IsString()
  @Matches(MONEY)
  transactionDebit?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY)
  transactionCredit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @IsOptional()
  @IsUUID()
  partyId?: string;

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

export class PostJournalEntryDto {
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

  @IsEnum(JournalSourceType)
  sourceType!: JournalSourceType;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsString()
  @MaxLength(128)
  idempotencyKey!: string;

  @IsOptional()
  @IsBoolean()
  allowSoftClosedOverride?: boolean;

  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
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
  @IsEnum(JournalSourceType)
  sourceType?: JournalSourceType;

  @IsOptional()
  @IsString()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;
}
