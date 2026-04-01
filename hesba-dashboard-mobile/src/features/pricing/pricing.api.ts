// ─── Pricing API ──────────────────────────────────────────────────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export interface CustomerPriceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  /** Prisma Decimal → string over HTTP */
  price: string;
  updatedAt: string;
}

export const pricingApi = {
  /** GET /pricing/customer/:customerId — all custom prices for a customer */
  listForCustomer: async (customerId: string): Promise<CustomerPriceItem[]> => {
    const res = await apiClient.get<{ data: CustomerPriceItem[] }>(
      API_ENDPOINTS.pricing.listForCustomer(customerId),
    );
    return res.data.data ?? [];
  },

  /** PUT /pricing/customer/:customerId/product/:productId */
  setForProduct: async (
    customerId: string,
    productId: string,
    price: number,
  ): Promise<CustomerPriceItem> => {
    const res = await apiClient.put<{ data: CustomerPriceItem }>(
      API_ENDPOINTS.pricing.setForProduct(customerId, productId),
      { price },
    );
    return res.data.data;
  },
};
