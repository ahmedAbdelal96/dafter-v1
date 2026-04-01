import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type {
  ApiResponse,
  CreateStandalonePaymentRequest,
  DistributePaymentRequest,
  DistributePaymentResult,
} from "../types";

type RecordStandalonePaymentResult = null;

export const paymentsApi = {
  async recordStandalonePayment(
    payload: CreateStandalonePaymentRequest
  ): Promise<RecordStandalonePaymentResult> {
    const response = await httpClient.post<
      RecordStandalonePaymentResult | ApiResponse<RecordStandalonePaymentResult>
    >(API_ENDPOINTS.payments.create, payload);

    return extractData(response.data);
  },

  async distributePayment(payload: DistributePaymentRequest): Promise<DistributePaymentResult> {
    const response = await httpClient.post<
      DistributePaymentResult | ApiResponse<DistributePaymentResult>
    >(API_ENDPOINTS.payments.distribute, payload);

    return extractData(response.data);
  },
};
