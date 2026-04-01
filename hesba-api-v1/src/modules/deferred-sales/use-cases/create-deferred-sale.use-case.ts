// ============================================================
// Use Case: Create Deferred Sale (إنشاء بيع آجل)
// ============================================================
// الخطوات:
//   1. التحقق من وجود الطرف في الشركة
//   2. توليد رقم مرجعي فريد (DEF-{YEAR}-{NNNN})
//   3. في $transaction واحد:
//      a. إنشاء LedgerEntry { entryType: INVOICE, signedAmount: +totalAmount }
//      b. إنشاء DeferredSale
//      c. Balance.upsert — increment by +totalAmount
//      d. AuditLog { action: 'deferred-sale.create' }
//   4. إرجاع البيع الآجل المنشأ
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LedgerEntryType, SaleType } from '@prisma/client';
import { DeferredSalesRepository } from '../deferred-sales.repository';
import { CreateDeferredSaleDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class CreateDeferredSaleUseCase {
  private readonly logger = new Logger(CreateDeferredSaleUseCase.name);

  constructor(
    private readonly repo: DeferredSalesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * تنفيذ عملية إنشاء بيع آجل
   *
   * يتحقق من وجود الطرف، يولّد رقماً مرجعياً، ثم ينفّذ العملية الكاملة
   * (LedgerEntry + DeferredSale + Balance + AuditLog) داخل $transaction واحد.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param userId - معرف المستخدم الذي ينفّذ العملية
   * @param dto - بيانات البيع الآجل الجديد
   * @returns البيع الآجل المنشأ
   * @throws NotFoundException إذا كان الطرف غير موجود
   * @throws BadRequestException إذا كانت البيانات غير صالحة
   */
  async execute(
    companyId: string,
    userId: string,
    dto: CreateDeferredSaleDto,
  ) {
    // ── Step 1: Validate party exists ───────────────────────────
    const partyFound = await this.repo.partyExists(
      companyId,
      dto.partyType,
      dto.partyId,
    );

    if (!partyFound) {
      throw new NotFoundException(
        this.t.translate('deferred-sales.create.partyNotFound'),
      );
    }

    // ── Step 2: Parse and validate dates ────────────────────────
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const entryDate = dto.entryDate
      ? (() => {
          const d = new Date(dto.entryDate);
          d.setUTCHours(0, 0, 0, 0);
          return d;
        })()
      : today;

    const dueDate = new Date(dto.dueDate);
    dueDate.setUTCHours(0, 0, 0, 0);

    if (dueDate < entryDate) {
      throw new BadRequestException(
        this.t.translate('deferred-sales.create.invalidDueDate'),
      );
    }

    // ── Step 3: Generate reference number ───────────────────────
    const year = today.getFullYear();
    const referenceNumber = await this.repo.generateReferenceNumber(
      companyId,
      year,
    );

    // ── Step 4: Execute atomic transaction ───────────────────────
    const result = await this.repo.withTransaction(async (tx) => {
      // Step 4a: Create LedgerEntry (INVOICE) — signedAmount is +totalAmount
      const ledgerEntry = await this.repo.createLedgerEntry(tx, {
        companyId,
        partyType: dto.partyType,
        partyId: dto.partyId,
        entryType: LedgerEntryType.INVOICE,
        signedAmount: dto.totalAmount, // Positive: represents debt owed by the party
        entryDate,
        dueDate,
        note: dto.description ?? null,
        saleType: SaleType.DEFERRED,
        createdById: userId,
      });

      // Step 4b: Create DeferredSale linked to the LedgerEntry
      const deferredSale = await this.repo.create(tx, {
        companyId,
        partyType: dto.partyType,
        partyId: dto.partyId,
        referenceNumber,
        totalAmount: dto.totalAmount,
        dueDate,
        description: dto.description ?? null,
        createdById: userId,
        ledgerEntryId: ledgerEntry.id,
      });

      // Step 4c: Increment balance — DB-level arithmetic (no JS floats)
      await this.repo.incrementBalance(
        tx,
        companyId,
        dto.partyType,
        dto.partyId,
        dto.totalAmount,
      );

      // Step 4d: AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'deferred-sale.create',
        entityType: 'deferred_sale',
        entityId: deferredSale.id,
        metadata: {
          referenceNumber,
          partyType: dto.partyType,
          partyId: dto.partyId,
          totalAmount: dto.totalAmount.toString(),
          dueDate: dueDate.toISOString().split('T')[0],
          ledgerEntryId: ledgerEntry.id,
        },
      });

      this.logger.log(
        `DeferredSale created: ${deferredSale.id} | ref: ${referenceNumber} | ` +
          `party: ${dto.partyType}/${dto.partyId} | amount: ${dto.totalAmount} | ` +
          `actor: ${userId}`,
      );

      return deferredSale;
    });

    return result;
  }
}
