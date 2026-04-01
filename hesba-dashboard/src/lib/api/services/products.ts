import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  Product,
  ProductFilters,
  CreateProductRequest,
  UpdateProductRequest,
  ProductsListResponse,
  ProductsListMeta,
} from "../types";

type ProductsListApiPayload =
  | (ApiResponse<Product[]> & { meta?: ProductsListMeta })
  | ApiEnvelope<{ items: Product[]; meta: ProductsListMeta }>
  | ApiEnvelope<{ products: Product[]; meta: ProductsListMeta }>;

type DeleteProductResult = null;

function isStructuredProductsList(
  value: unknown
): value is { items: Product[]; meta: ProductsListMeta } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && Boolean(candidate.meta);
}

function isProductsListContainer(
  value: unknown
): value is { items: Product[]; meta?: ProductsListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

function isProductsLegacyContainer(
  value: unknown
): value is { products: Product[]; meta?: ProductsListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { products?: unknown }).products);
}

function normalizeProductsList(payload: ProductsListApiPayload): ProductsListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as Product[],
      meta: {
        total: payload.length,
        page: 1,
        limit: Math.max(payload.length, 1),
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  if (isProductsListContainer(payload)) {
    const items = payload.items;
    const meta = payload.meta ?? {
      total: items.length,
      page: 1,
      limit: Math.max(items.length, 1),
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    return { items, meta };
  }

  if (isApiEnvelope<unknown>(payload) && isStructuredProductsList(payload.data)) {
    return payload.data;
  }

  if (isApiEnvelope<unknown>(payload) && isProductsLegacyContainer(payload.data)) {
    const items = payload.data.products;
    const meta = payload.data.meta ?? {
      total: items.length,
      page: 1,
      limit: Math.max(items.length, 1),
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    return { items, meta };
  }

  const rawData = isApiEnvelope<unknown>(payload)
    ? payload.data
    : (payload as { data?: unknown }).data;
  const items = Array.isArray(rawData)
    ? rawData
    : isProductsLegacyContainer(rawData)
      ? rawData.products
      : [];

  return {
    items,
    meta: {
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

export const productsApi = {
  async getAll(filters?: ProductFilters): Promise<ProductsListResponse> {
    const response = await httpClient.get<ProductsListApiPayload>(
      API_ENDPOINTS.products.list,
      { params: filters }
    );

    return normalizeProductsList(response.data);
  },

  async getById(id: string): Promise<Product> {
    const response = await httpClient.get<Product | ApiResponse<Product>>(
      API_ENDPOINTS.products.get(id)
    );
    return extractData(response.data);
  },

  async create(data: CreateProductRequest): Promise<Product> {
    const response = await httpClient.post<Product | ApiResponse<Product>>(
      API_ENDPOINTS.products.create,
      data
    );
    return extractData(response.data);
  },

  async update(id: string, data: UpdateProductRequest): Promise<Product> {
    const response = await httpClient.patch<Product | ApiResponse<Product>>(
      API_ENDPOINTS.products.update(id),
      data
    );
    return extractData(response.data);
  },

  async delete(id: string): Promise<DeleteProductResult> {
    const response = await httpClient.delete<
      DeleteProductResult | ApiResponse<DeleteProductResult>
    >(API_ENDPOINTS.products.delete(id));
    return extractData(response.data);
  },
};
