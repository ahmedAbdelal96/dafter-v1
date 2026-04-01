import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "../services/employees";
import { EMPLOYEES_CACHE } from "./config";
import { employeesKeys } from "./query-keys";
import type {
  EmployeesListResponse,
  EmployeeFilters,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "../types";

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeesKeys.list(filters),
    queryFn: () => employeesApi.getAll(filters),
    staleTime: EMPLOYEES_CACHE.list.staleTime,
    gcTime: EMPLOYEES_CACHE.list.gcTime,
  });
}

export function useEmployee(id: string, enabled = true) {
  return useQuery({
    queryKey: employeesKeys.detail(id),
    queryFn: () => employeesApi.getById(id),
    staleTime: EMPLOYEES_CACHE.single.staleTime,
    gcTime: EMPLOYEES_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEmployeeRequest) => employeesApi.create(payload),
    onSuccess: (newEmployee) => {
      queryClient.setQueriesData<EmployeesListResponse>(
        { queryKey: employeesKeys.lists() },
        (previous) => {
          if (!previous) return previous;

          const alreadyExists = previous.items.some((item) => item.id === newEmployee.id);
          if (alreadyExists) return previous;

          const nextItems = [newEmployee, ...previous.items].slice(
            0,
            Math.max(previous.meta.limit, 1)
          );

          return {
            items: nextItems,
            meta: {
              ...previous.meta,
              total: previous.meta.total + 1,
              totalPages: Math.max(
                1,
                Math.ceil((previous.meta.total + 1) / Math.max(previous.meta.limit, 1))
              ),
            },
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeeRequest }) =>
      employeesApi.update(id, payload),
    onSuccess: (employee) => {
      queryClient.setQueryData(employeesKeys.detail(employee.id), employee);
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: employeesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
}
