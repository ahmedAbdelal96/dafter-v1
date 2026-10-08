import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { pricingApi } from './pricing.api';

/** All custom prices for a customer (lazy — only fetches when customerId provided) */
export function useCustomerPrices(customerId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_PRICES(customerId ?? ''),
    queryFn: () => pricingApi.listForCustomer(customerId!),
    enabled: Boolean(customerId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** Set (upsert) a custom price for a customer+product pair */
export function useSetCustomerPrice(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      price,
    }: {
      productId: string;
      price: number;
    }) => pricingApi.setForProduct(customerId, productId, price),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CUSTOMER_PRICES(customerId),
      });
    },
  });
}
