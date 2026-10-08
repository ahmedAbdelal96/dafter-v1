// ============================================================
// PricingRepository — Customer-Specific Product Pricing
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CustomerPriceRecord {
  id: string;
  companyId: string;
  customerId: string;
  productId: string;
  price: Prisma.Decimal;
  updatedById: string;
  updatedBy: { id: string; fullName: string | null };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Get the custom price for a specific customer+product pair. Returns null if not set. */
  async findOne(
    companyId: string,
    customerId: string,
    productId: string,
  ): Promise<CustomerPriceRecord | null> {
    return this.prisma.customerProductPrice.findUnique({
      where: {
        companyId_customerId_productId: { companyId, customerId, productId },
      },
      include: { updatedBy: { select: { id: true, fullName: true } } },
    });
  }

  /** Upsert a custom price — creates or replaces the existing record. */
  async upsert(
    companyId: string,
    customerId: string,
    productId: string,
    price: number,
    updatedById: string,
  ): Promise<CustomerPriceRecord> {
    return this.prisma.customerProductPrice.upsert({
      where: {
        companyId_customerId_productId: { companyId, customerId, productId },
      },
      create: {
        companyId,
        customerId,
        productId,
        price: new Prisma.Decimal(price),
        updatedById,
      },
      update: {
        price: new Prisma.Decimal(price),
        updatedById,
      },
      include: { updatedBy: { select: { id: true, fullName: true } } },
    });
  }

  /** Get all custom prices for a customer (used in invoice create to suggest prices). */
  async findForCustomer(
    companyId: string,
    customerId: string,
  ): Promise<{ productId: string; price: Prisma.Decimal }[]> {
    return this.prisma.customerProductPrice.findMany({
      where: { companyId, customerId },
      select: { productId: true, price: true },
    });
  }

  /** Get all custom prices for a customer, joined with product name/SKU (for list endpoint). */
  async findForCustomerWithProducts(
    companyId: string,
    customerId: string,
  ): Promise<
    {
      id: string;
      productId: string;
      productName: string;
      sku: string | null;
      price: Prisma.Decimal;
      updatedAt: Date;
    }[]
  > {
    const rows = await this.prisma.customerProductPrice.findMany({
      where: { companyId, customerId },
      select: {
        id: true,
        productId: true,
        price: true,
        updatedAt: true,
        product: { select: { name: true, sku: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      sku: r.product.sku,
      price: r.price,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Lookup helper used by invoice item typeahead (B6.5):
   * returns custom price if set, otherwise returns last-sold price
   * from InvoiceItems, otherwise returns null.
   */
  async resolveSuggestedPrice(
    companyId: string,
    customerId: string,
    productId: string,
  ): Promise<{ source: 'custom' | 'last_sold' | 'catalog'; price: Prisma.Decimal } | null> {
    // 1. Custom price
    const custom = await this.prisma.customerProductPrice.findUnique({
      where: {
        companyId_customerId_productId: { companyId, customerId, productId },
      },
      select: { price: true },
    });
    if (custom) return { source: 'custom', price: custom.price };

    // 2. Last sold price for this customer+product combination
    const lastItem = await this.prisma.invoiceItem.findFirst({
      where: {
        productId,
        invoice: {
          companyId,
          partyId: customerId,
          status: 'APPROVED',
          isDeleted: false,
        },
      },
      orderBy: { invoice: { issueDate: 'desc' } },
      select: { unitPrice: true },
    });
    if (lastItem) return { source: 'last_sold', price: lastItem.unitPrice };

    // 3. Catalog default price
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, isDeleted: false },
      select: { unitPrice: true },
    });
    if (product) return { source: 'catalog', price: product.unitPrice };

    return null;
  }
}
