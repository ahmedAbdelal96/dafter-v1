import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  User,
  UsersListResponse,
  UserStats,
  UsersQuery,
  CreateStaffDto,
  UpdateUserDto,
  UpdatePermissionsDto,
  StaffPermissionRecord,
} from '../types';

export const usersApi = {
  list: async (params?: UsersQuery): Promise<UsersListResponse> => {
    const res = await apiClient.get<{ data: User[]; meta: UsersListResponse['meta'] }>(
      API_ENDPOINTS.users.list,
      { params },
    );
    return { data: res.data.data, meta: res.data.meta };
  },

  get: async (id: string): Promise<User> => {
    const res = await apiClient.get<{ data: User }>(API_ENDPOINTS.users.get(id));
    return res.data.data;
  },

  stats: async (): Promise<UserStats> => {
    const res = await apiClient.get<{ data: UserStats }>(API_ENDPOINTS.users.stats);
    return res.data.data;
  },

  createStaff: async (dto: CreateStaffDto): Promise<User> => {
    const res = await apiClient.post<{ data: User }>(API_ENDPOINTS.users.createStaff, dto);
    return res.data.data;
  },

  update: async (id: string, dto: UpdateUserDto): Promise<User> => {
    const res = await apiClient.patch<{ data: User }>(API_ENDPOINTS.users.update(id), dto);
    return res.data.data;
  },

  updatePermissions: async (
    id: string,
    dto: UpdatePermissionsDto,
  ): Promise<StaffPermissionRecord> => {
    const res = await apiClient.patch<{ data: StaffPermissionRecord }>(
      API_ENDPOINTS.users.updatePermissions(id),
      dto,
    );
    return res.data.data;
  },

  disable: async (id: string): Promise<User> => {
    const res = await apiClient.patch<{ data: User }>(API_ENDPOINTS.users.disable(id));
    return res.data.data;
  },

  enable: async (id: string): Promise<User> => {
    const res = await apiClient.patch<{ data: User }>(API_ENDPOINTS.users.enable(id));
    return res.data.data;
  },

  resetCredentials: async (
    id: string,
    dto?: { channel?: 'email' | 'whatsapp'; reason?: string },
  ): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.users.resetCredentials(id), dto ?? {});
  },
};
