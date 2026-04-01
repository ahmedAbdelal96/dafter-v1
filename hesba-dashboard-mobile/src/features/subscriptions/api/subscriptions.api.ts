import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type { EffectiveEntitlements } from '../types';

export const subscriptionsApi = {
  /**
   * GET /my/entitlements
   * Returns the current company's plan, status, features, and quota usage.
   */
  async getMyEntitlements(): Promise<EffectiveEntitlements> {
    const res = await apiClient.get<{ data: EffectiveEntitlements }>(
      API_ENDPOINTS.entitlements.mine,
    );
    return res.data.data;
  },
};
