import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashReconciliationMode, CashReconciliationStatus } from '@prisma/client';
import { TranslationService } from '../../common/services/translation.service';
import { CashReconciliationRepository } from './cash-reconciliation.repository';
import { UpsertDailyReconciliationDto } from './dto/upsert-daily-reconciliation.dto';
import { UpdateDailyReconciliationDto } from './dto/update-daily-reconciliation.dto';

@Injectable()
export class CashReconciliationService {
  constructor(
    private readonly repo: CashReconciliationRepository,
    private readonly t: TranslationService,
  ) {}

  private toBusinessDate(value: string): Date {
    const asDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(asDate.getTime())) {
      throw new BadRequestException(this.t.translate('cashReconciliation.validation.invalidBusinessDate'));
    }
    return asDate;
  }

  private parseRange(dateFrom?: string, dateTo?: string) {
    const parsedFrom = dateFrom ? this.toBusinessDate(dateFrom) : undefined;
    const parsedTo = dateTo ? this.toBusinessDate(dateTo) : undefined;

    if (parsedFrom && parsedTo && parsedFrom.getTime() > parsedTo.getTime()) {
      throw new BadRequestException(this.t.translate('cashReconciliation.validation.invalidDateRange'));
    }

    return { parsedFrom, parsedTo };
  }

  private async assertModeEnabled(companyId: string) {
    const company = await this.repo.getCompanyCashMode(companyId);
    if (!company) {
      throw new NotFoundException(this.t.translate('companies.get.notFound'));
    }

    if (company.cashReconciliationMode === CashReconciliationMode.DISABLED) {
      throw new ForbiddenException(this.t.translate('cashReconciliation.mode.disabled'));
    }
  }

  private calculateExpectedCash(values: {
    openingCash: number;
    cashSalesOutsideSystem: number;
    cashExpensesOutsideSystem: number;
  }): number {
    return values.openingCash + values.cashSalesOutsideSystem - values.cashExpensesOutsideSystem;
  }

  private calculateVariance(actualCashCounted: number, expectedCash: number): number {
    return actualCashCounted - expectedCash;
  }

  async getDaily(companyId: string, businessDate?: string) {
    await this.assertModeEnabled(companyId);
    if (!businessDate) {
      return null;
    }
    const parsedDate = this.toBusinessDate(businessDate);
    return this.repo.findByCompanyAndBusinessDate(companyId, parsedDate);
  }

  async getById(companyId: string, id: string) {
    await this.assertModeEnabled(companyId);
    const record = await this.repo.findById(companyId, id);
    if (!record) {
      throw new NotFoundException(this.t.translate('cashReconciliation.daily.notFound'));
    }

    return record;
  }

  async getHistory(params: {
    companyId: string;
    page?: number;
    limit?: number;
    status?: CashReconciliationStatus;
    dateFrom?: string;
    dateTo?: string;
  }) {
    await this.assertModeEnabled(params.companyId);
    const { parsedFrom, parsedTo } = this.parseRange(params.dateFrom, params.dateTo);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const result = await this.repo.findHistory({
      companyId: params.companyId,
      page,
      limit,
      status: params.status,
      dateFrom: parsedFrom,
      dateTo: parsedTo,
    });

    return {
      items: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      },
    };
  }

  async getSummary(companyId: string, dateFrom?: string, dateTo?: string) {
    await this.assertModeEnabled(companyId);
    const { parsedFrom, parsedTo } = this.parseRange(dateFrom, dateTo);
    const summary = await this.repo.getSummary({
      companyId,
      dateFrom: parsedFrom,
      dateTo: parsedTo,
    });

    return {
      range: {
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      },
      totals: {
        totalRecords: summary.totalRecords,
        draftCount: summary.draftCount,
        closedCount: summary.closedCount,
        totalVariance: Number(summary.totalVariance),
        positiveVarianceDays: summary.positiveVarianceDays,
        negativeVarianceDays: summary.negativeVarianceDays,
      },
      latestClosedRecord: summary.latestClosedRecord,
    };
  }

  async upsertDraft(companyId: string, actorUserId: string, dto: UpsertDailyReconciliationDto) {
    await this.assertModeEnabled(companyId);
    const businessDate = this.toBusinessDate(dto.businessDate);

    const existing = await this.repo.findByCompanyAndBusinessDate(companyId, businessDate);
    if (existing) {
      if (existing.status === CashReconciliationStatus.CLOSED) {
        throw new ConflictException(
          this.t.translate('cashReconciliation.daily.alreadyClosedForDate'),
        );
      }

      return {
        record: existing,
        created: false,
      };
    }

    const openingCash = dto.openingCash ?? 0;
    const cashSalesOutsideSystem = dto.cashSalesOutsideSystem ?? 0;
    const cashExpensesOutsideSystem = dto.cashExpensesOutsideSystem ?? 0;
    const actualCashCounted = dto.actualCashCounted ?? 0;
    const expectedCash = this.calculateExpectedCash({
      openingCash,
      cashSalesOutsideSystem,
      cashExpensesOutsideSystem,
    });
    const variance = this.calculateVariance(actualCashCounted, expectedCash);

    const created = await this.repo.createDraft(companyId, businessDate, actorUserId, {
      openingCash,
      cashSalesOutsideSystem,
      cashExpensesOutsideSystem,
      actualCashCounted,
      expectedCash,
      variance,
      note: dto.note ?? null,
    });

    return {
      record: created,
      created: true,
    };
  }

  async updateDraft(companyId: string, id: string, actorUserId: string, dto: UpdateDailyReconciliationDto) {
    await this.assertModeEnabled(companyId);
    const existing = await this.repo.findById(companyId, id);
    if (!existing) {
      throw new NotFoundException(this.t.translate('cashReconciliation.daily.notFound'));
    }

    if (existing.status !== CashReconciliationStatus.DRAFT) {
      throw new ConflictException(this.t.translate('cashReconciliation.daily.lockedAfterClose'));
    }

    const openingCashForUpdate = dto.openingCash ?? Number(existing.openingCash);
    const cashSalesOutsideSystemForUpdate =
      dto.cashSalesOutsideSystem ?? Number(existing.cashSalesOutsideSystem);
    const cashExpensesOutsideSystemForUpdate =
      dto.cashExpensesOutsideSystem ?? Number(existing.cashExpensesOutsideSystem);
    const actualCashCountedForUpdate = dto.actualCashCounted ?? Number(existing.actualCashCounted);
    const expectedCashForUpdate = this.calculateExpectedCash({
      openingCash: openingCashForUpdate,
      cashSalesOutsideSystem: cashSalesOutsideSystemForUpdate,
      cashExpensesOutsideSystem: cashExpensesOutsideSystemForUpdate,
    });
    const varianceForUpdate = this.calculateVariance(
      actualCashCountedForUpdate,
      expectedCashForUpdate,
    );

    const updated = await this.repo.updateDraft(id, companyId, actorUserId, {
      openingCash: openingCashForUpdate,
      cashSalesOutsideSystem: cashSalesOutsideSystemForUpdate,
      cashExpensesOutsideSystem: cashExpensesOutsideSystemForUpdate,
      actualCashCounted: actualCashCountedForUpdate,
      expectedCash: expectedCashForUpdate,
      variance: varianceForUpdate,
      note: dto.note,
    });

    if (!updated) {
      throw new NotFoundException(this.t.translate('cashReconciliation.daily.notFound'));
    }
    return updated;
  }

  async closeDraft(companyId: string, id: string, actorUserId: string) {
    await this.assertModeEnabled(companyId);
    const existing = await this.repo.findById(companyId, id);
    if (!existing) {
      throw new NotFoundException(this.t.translate('cashReconciliation.daily.notFound'));
    }

    if (existing.status !== CashReconciliationStatus.DRAFT) {
      throw new ConflictException(this.t.translate('cashReconciliation.daily.alreadyClosed'));
    }

    const closed = await this.repo.closeDraft(id, companyId, actorUserId);
    if (!closed) {
      throw new NotFoundException(this.t.translate('cashReconciliation.daily.notFound'));
    }

    return closed;
  }
}
