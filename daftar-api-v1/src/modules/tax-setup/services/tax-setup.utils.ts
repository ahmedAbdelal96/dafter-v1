import { Prisma } from '@prisma/client';
import { TaxListMeta } from '../types/tax-setup.types';

export function normalizeTaxCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value);
}

export function decimalToString(value: Prisma.Decimal | string | number): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toFixed(4);
  return value.toString();
}

export function buildListMeta(total: number, page: number, limit: number): TaxListMeta {
  const safeLimit = Math.max(limit, 1);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

export function computeTaxSetupReadiness(params: {
  hasProfile: boolean;
  hasTaxRates: boolean;
  hasTaxTreatments: boolean;
  hasDefaultPolicy: boolean;
  hasAccountBinding: boolean;
}): 'NOT_CONFIGURED' | 'PARTIALLY_CONFIGURED' | 'READY' {
  const complete =
    params.hasProfile &&
    params.hasTaxRates &&
    params.hasTaxTreatments &&
    params.hasDefaultPolicy &&
    params.hasAccountBinding;

  if (complete) {
    return 'READY';
  }

  const anyConfigured =
    params.hasProfile ||
    params.hasTaxRates ||
    params.hasTaxTreatments ||
    params.hasDefaultPolicy ||
    params.hasAccountBinding;

  return anyConfigured ? 'PARTIALLY_CONFIGURED' : 'NOT_CONFIGURED';
}
