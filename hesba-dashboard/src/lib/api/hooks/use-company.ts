"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyApi, type UpdateMyCompanyPayload } from "@/lib/api/services/company";
import { companyKeys } from "./query-keys";

export function useMyCompany() {
  return useQuery({
    queryKey: companyKeys.me(),
    queryFn: companyApi.getMe,
    staleTime: 5 * 60 * 1000, // company profile changes rarely
  });
}

export function useUpdateMyCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMyCompanyPayload) => companyApi.updateMe(payload),
    onSuccess: (updated) => {
      // Write the updated value directly into the cache — no refetch needed
      queryClient.setQueryData(companyKeys.me(), updated);
    },
  });
}
