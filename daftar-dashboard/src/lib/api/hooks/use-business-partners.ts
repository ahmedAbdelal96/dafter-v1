import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessPartnersApi } from "../services/business-partners";
import { businessPartnersKeys } from "./query-keys";
import type { BusinessPartnerFilters, BusinessPartnerInput } from "../types/operations";

export function useBusinessPartners(filters?: BusinessPartnerFilters) {
  return useQuery({
    queryKey: businessPartnersKeys.list(filters),
    queryFn: () => businessPartnersApi.getAll(filters),
  });
}

export function useBusinessPartner(id: string, enabled = true) {
  return useQuery({
    queryKey: businessPartnersKeys.detail(id),
    queryFn: () => businessPartnersApi.getById(id),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateBusinessPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BusinessPartnerInput) => businessPartnersApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessPartnersKeys.all }),
  });
}

export function useUpdateBusinessPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BusinessPartnerInput> & { version: number } }) =>
      businessPartnersApi.update(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: businessPartnersKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessPartnersKeys.detail(variables.id) });
    },
  });
}

export function useSetBusinessPartnerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive, version }: { id: string; isActive: boolean; version: number }) =>
      businessPartnersApi.setActive(id, { isActive, version }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessPartnersKeys.all }),
  });
}
