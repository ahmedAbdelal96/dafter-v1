// ─── Products API ─────────────────────────────────────────────────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Product,
  ProductsListResponse,
  ProductsQuery,
  CreateProductDto,
  UpdateProductDto,
} from '../types';

export const productsApi = {
  /** GET /products?page&limit&search&category&isActive */
  list: async (params?: ProductsQuery): Promise<ProductsListResponse> => {
    const res = await apiClient.get<{ data: ProductsListResponse }>(
      API_ENDPOINTS.products.list,
      { params },
    );
    return res.data.data;
  },

  /** GET /products/:id */
  get: async (id: string): Promise<Product> => {
    const res = await apiClient.get<{ data: Product }>(
      API_ENDPOINTS.products.get(id),
    );
    return res.data.data;
  },

  /** POST /products */
  create: async (dto: CreateProductDto): Promise<Product> => {
    const res = await apiClient.post<{ data: Product }>(
      API_ENDPOINTS.products.create,
      dto,
    );
    return res.data.data;
  },

  /** PATCH /products/:id */
  update: async (id: string, dto: UpdateProductDto): Promise<Product> => {
    const res = await apiClient.patch<{ data: Product }>(
      API_ENDPOINTS.products.update(id),
      dto,
    );
    return res.data.data;
  },

  /** DELETE /products/:id (soft-delete) */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.products.delete(id));
  },
};
