import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pricingApi } from "../services/pricing";
import { TIME } from "./config";
import { pricingKeys } from "./query-keys";

export function useCustomerPrices(customerId: string) {
  return useQuery({
    queryKey: pricingKeys.forCustomer(customerId),
    queryFn: () => pricingApi.listForCustomer(customerId),
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
    enabled: Boolean(customerId),
  });
}

export function useSetCustomerPrice(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) =>
      pricingApi.setForProduct(customerId, productId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.forCustomer(customerId) });
    },
  });
}
