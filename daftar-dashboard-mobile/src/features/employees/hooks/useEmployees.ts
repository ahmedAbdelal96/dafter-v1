// ─── Employees Hooks ──────────────────────────────────────────────────────────
// All server state managed via TanStack Query v5.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { employeesApi } from '../api/employees.api';
import type { CreateEmployeeDto, UpdateEmployeeDto, EmployeeListParams } from '../types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** Paginated list with optional search/filter. Params are part of the query key. */
export function useListEmployees(params?: EmployeeListParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.EMPLOYEES, params],
    queryFn: () => employeesApi.list(params),
  });
}

/** Single employee detail (includes current balance). Skips if id is null. */
export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE(id ?? ''),
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => employeesApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeDto }) =>
      employeesApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE(id) });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
}
