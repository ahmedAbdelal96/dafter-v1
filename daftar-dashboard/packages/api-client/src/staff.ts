/**
 * Staff API Client
 * All endpoints from dafter-backend-v1/src/modules/staff/staff.controller.ts
 */

import { httpClient } from '@/lib/api/http-client';
import type {
  Staff,
  CreateStaffDto,
  UpdateStaffDto,
  StaffQueryDto,
  StaffResponse,
  StaffPerformanceParams,
  StaffPerformanceResponse,
  UpdateAvailabilityDto,
  StaffAvailability,
} from '@/types/staff';

export const staffApi = {
  // GET all staff with pagination and filters
  getAll: (params?: StaffQueryDto) =>
    httpClient.get<StaffResponse>('/staff', { params }),

  // GET staff performance metrics
  getPerformance: (params?: StaffPerformanceParams) =>
    httpClient.get<StaffPerformanceResponse>('/staff/performance', { params }),

  // GET by ID
  getById: (id: string) =>
    httpClient.get<Staff>(`/staff/${id}`),

  // POST create
  create: (data: CreateStaffDto) =>
    httpClient.post<Staff>('/staff', data),

  // PATCH update
  update: (id: string, data: UpdateStaffDto) =>
    httpClient.patch<Staff>(`/staff/${id}`, data),

  // DELETE (soft delete - sets isActive = false)
  delete: (id: string) =>
    httpClient.delete(`/staff/${id}`),

  // PUT update availability
  updateAvailability: (id: string, data: UpdateAvailabilityDto) =>
    httpClient.put<StaffAvailability[]>(`/staff/${id}/availability`, data),

  // PATCH upload avatar
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return httpClient.patch<Staff>(`/staff/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // DELETE avatar
  deleteAvatar: (id: string) =>
    httpClient.delete<Staff>(`/staff/${id}/avatar`),
};
