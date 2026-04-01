import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type { ApiResponse } from "../types";

export interface CustomerPriceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  price: string; // Prisma Decimal → string over HTTP
  updatedAt: string;
}

export const pricingApi = {
  async listForCustomer(customerId: string): Promise<CustomerPriceItem[]> {
    const response = await httpClient.get<
      CustomerPriceItem[] | ApiResponse<CustomerPriceItem[]>
    >(API_ENDPOINTS.pricing.listForCustomer(customerId));
    return extractData(response.data);
  },

  async setForProduct(
    customerId: string,
    productId: string,
    price: number,
  ): Promise<CustomerPriceItem> {
    const response = await httpClient.put<
      CustomerPriceItem | ApiResponse<CustomerPriceItem>
    >(API_ENDPOINTS.pricing.setForProduct(customerId, productId), { price });
    return extractData(response.data);
  },
};
