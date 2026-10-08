import { NotFoundException } from '@nestjs/common';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';
import {
  computeDraftItems,
  normalizeIssueDateToUtcStart,
  sumItemTotals,
  validateDraftItemProducts,
} from './invoice-draft-preparation.util';

describe('invoice-draft-preparation.util', () => {
  describe('validateDraftItemProducts', () => {
    it('returns without repo calls when items are undefined', async () => {
      const repo = {
        productBelongsToCompany: jest.fn(),
      } as unknown as InvoicesRepository;
      const t = {
        translate: jest.fn((key: string) => key),
      } as unknown as TranslationService;

      await expect(
        validateDraftItemProducts(undefined, 'company-1', repo, t),
      ).resolves.toBeUndefined();
      expect((repo as any).productBelongsToCompany).not.toHaveBeenCalled();
    });

    it('skips items without productId', async () => {
      const repo = {
        productBelongsToCompany: jest.fn(),
      } as unknown as InvoicesRepository;
      const t = {
        translate: jest.fn((key: string) => key),
      } as unknown as TranslationService;

      await expect(
        validateDraftItemProducts(
          [{ description: 'free text', quantity: 1, unitPrice: 10 }],
          'company-1',
          repo,
          t,
        ),
      ).resolves.toBeUndefined();
      expect((repo as any).productBelongsToCompany).not.toHaveBeenCalled();
    });

    it('validates each item with productId when present', async () => {
      const repo = {
        productBelongsToCompany: jest.fn().mockResolvedValue(true),
      } as unknown as InvoicesRepository;
      const t = {
        translate: jest.fn((key: string) => key),
      } as unknown as TranslationService;

      await expect(
        validateDraftItemProducts(
          [
            {
              productId: 'p-1',
              description: 'item 1',
              quantity: 1,
              unitPrice: 10,
            },
            {
              productId: 'p-2',
              description: 'item 2',
              quantity: 2,
              unitPrice: 5,
            },
          ],
          'company-1',
          repo,
          t,
        ),
      ).resolves.toBeUndefined();

      expect((repo as any).productBelongsToCompany).toHaveBeenCalledTimes(2);
      expect((repo as any).productBelongsToCompany).toHaveBeenNthCalledWith(
        1,
        'p-1',
        'company-1',
      );
      expect((repo as any).productBelongsToCompany).toHaveBeenNthCalledWith(
        2,
        'p-2',
        'company-1',
      );
    });

    it('throws NotFoundException when a product is invalid', async () => {
      const repo = {
        productBelongsToCompany: jest.fn().mockResolvedValue(false),
      } as unknown as InvoicesRepository;
      const t = {
        translate: jest.fn(() => 'invoices.productNotFound'),
      } as unknown as TranslationService;

      await expect(
        validateDraftItemProducts(
          [
            {
              productId: 'invalid-product',
              description: 'item',
              quantity: 1,
              unitPrice: 10,
            },
          ],
          'company-1',
          repo,
          t,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect((t as any).translate).toHaveBeenCalledWith(
        'invoices.productNotFound',
        { sku: 'invalid-product' },
      );
    });
  });

  describe('computeDraftItems + sumItemTotals', () => {
    it('computes line totals and normalizes missing productId to null', () => {
      const computed = computeDraftItems([
        { description: 'no product', quantity: 1.5, unitPrice: 10 },
        { productId: 'p-2', description: 'with product', quantity: 2, unitPrice: 3.25 },
      ]);

      expect(computed).toHaveLength(2);
      expect(computed[0].productId).toBeNull();
      expect(computed[0].total.toString()).toBe('15');
      expect(computed[1].productId).toBe('p-2');
      expect(computed[1].total.toString()).toBe('6.5');
    });

    it('sums item totals as Decimal-safe subtotal', () => {
      const computed = computeDraftItems([
        { description: 'item 1', quantity: 2, unitPrice: 4.25 },
        { description: 'item 2', quantity: 1, unitPrice: 1.5 },
      ]);

      const subtotal = sumItemTotals(computed);
      expect(subtotal.toString()).toBe('10');
    });

    it('keeps create/update shared math consistent through composition', () => {
      const items = [
        { description: 'x', quantity: 3, unitPrice: 2.5 },
        { description: 'y', quantity: 1, unitPrice: 4.75 },
      ];
      const subtotal = sumItemTotals(computeDraftItems(items));

      expect(subtotal.toString()).toBe('12.25');
    });
  });

  describe('normalizeIssueDateToUtcStart', () => {
    it('normalizes date to UTC start-of-day', () => {
      const result = normalizeIssueDateToUtcStart('2026-03-17T15:21:33.999Z');

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
      expect(result.toISOString()).toBe('2026-03-17T00:00:00.000Z');
    });
  });
});
