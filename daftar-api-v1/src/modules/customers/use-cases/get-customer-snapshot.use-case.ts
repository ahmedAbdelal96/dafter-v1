// ============================================================
// Use Case: Get Customer Snapshot (ملخص العميل أثناء البيع)
// ============================================================
//
// Returns a lightweight summary of a customer's financial state,
// designed to be shown instantly when the user picks a customer
// during invoice creation.
//
// Data points:
//   - currentBalance    : live balance from Balance table
//   - creditLimit       : credit ceiling (null = unlimited)
//   - overdueAmount     : sum of remaining OVERDUE deferred sales
//   - lastInvoiceDate   : most recent APPROVED invoice
//   - lastPaymentDate   : most recent PAYMENT ledger entry
//   - openInvoicesCount : count of APPROVED invoices
//   - totalPurchases    : sum of APPROVED invoice totals
//   - hasOverdue        : boolean shortcut for UI warning
//
// Cache: 2-minute TTL per (companyId, customerId) — avoids
// repeated 5-query aggregation on every customer picker change.
// Cache is invalidated by any mutation that would change the
// snapshot (invoice approve/cancel, deferred-sale payment).
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomersRepository } from '../customers.repository';
import { TranslationService } from '../../../common/services/translation.service';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class GetCustomerSnapshotUseCase {
  /** In-process TTL cache — lightweight alternative to Redis for hot-path reads */
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly repo: CustomersRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException - Customer not found
   */
  async execute(companyId: string, customerId: string) {
    const key = `${companyId}:${customerId}`;
    const now = Date.now();

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const snapshot = await this.repo.getSnapshot(companyId, customerId);
    if (!snapshot) {
      throw new NotFoundException(
        this.t.translate('customers.get.notFound'),
      );
    }

    this.cache.set(key, { data: snapshot, expiresAt: now + CACHE_TTL_MS });
    return snapshot;
  }

  /**
   * Invalidate cache entry for a specific customer.
   * Call this from any use-case that mutates invoice/deferred-sale/payment data.
   */
  invalidate(companyId: string, customerId: string): void {
    this.cache.delete(`${companyId}:${customerId}`);
  }

  /**
   * Invalidate all cached snapshots for a company (e.g. after bulk operations).
   */
  invalidateCompany(companyId: string): void {
    const prefix = `${companyId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}
