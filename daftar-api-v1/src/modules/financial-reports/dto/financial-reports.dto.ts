import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsUUID, Max, Min, IsEnum, IsString } from 'class-validator';
import { JournalSourceType } from '@prisma/client';

export class ReportDateRangeDto {
  @IsDateString() fromDate!: string;
  @IsDateString() toDate!: string;
}

export class GeneralLedgerQueryDto extends ReportDateRangeDto {
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() journalId?: string;
  @IsOptional() @IsUUID() businessPartnerId?: string;
  @IsOptional() @IsEnum(JournalSourceType) sourceType?: JournalSourceType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 100;
}

export class TrialBalanceQueryDto extends ReportDateRangeDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeZero = false;
}

export class AsOfDateQueryDto {
  @IsDateString() asOfDate!: string;
}

export class StatementQueryDto extends ReportDateRangeDto {
  @IsUUID() businessPartnerId!: string;
  @IsOptional() @IsString() currency?: string;
}

export class PeriodCloseQueryDto {
  @IsUUID() periodId!: string;
}
