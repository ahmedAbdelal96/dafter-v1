import { AxiosError } from "axios";

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
  isOperational: boolean;

  constructor(params: {
    message: string;
    statusCode?: number;
    code?: string;
    details?: Record<string, unknown>;
    isOperational?: boolean;
  }) {
    super(params.message);
    this.name = "AppError";
    this.statusCode = params.statusCode ?? 500;
    this.code = params.code;
    this.details = params.details;
    this.isOperational = params.isOperational ?? true;
  }
}

type ErrorShape = {
  message?: string | string[];
  error?: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  featureKey?: string;
  entity?: string;
  limit?: number | string | null;
  current?: number;
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const responseData = error.response?.data as ErrorShape | undefined;
    const rawMessage = responseData?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage || error.message || "Unexpected API error";

    const details =
      responseData?.details ??
      (responseData
        ? extractErrorDetails(responseData)
        : undefined);

    return new AppError({
      message,
      statusCode: responseData?.statusCode ?? error.response?.status ?? 500,
      // Prefer machine-readable code if provided, fallback to generic error discriminator.
      code: responseData?.code ?? responseData?.error,
      details,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      message: error.message,
      statusCode: 500,
      isOperational: false,
    });
  }

  return new AppError({ message: "Unexpected error", statusCode: 500 });
}

export function isUnauthorizedError(error: unknown): boolean {
  return toAppError(error).statusCode === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return toAppError(error).statusCode === 403;
}

export type EntitlementErrorCode =
  | "FEATURE_NOT_AVAILABLE"
  | "PLAN_LIMIT_REACHED"
  | "SUBSCRIPTION_INACTIVE";

export interface EntitlementErrorDetails {
  code: EntitlementErrorCode;
  featureKey?: string;
  entity?: string;
  limit?: number | string | null;
  current?: number;
}

const ENTITLEMENT_CODES: readonly EntitlementErrorCode[] = [
  "FEATURE_NOT_AVAILABLE",
  "PLAN_LIMIT_REACHED",
  "SUBSCRIPTION_INACTIVE",
] as const;

export function getEntitlementErrorDetails(error: unknown): EntitlementErrorDetails | null {
  const appError = toAppError(error);
  if (appError.statusCode !== 403) {
    return null;
  }

  const detailCode = appError.details?.code;
  const rawCode = typeof appError.code === "string" ? appError.code : detailCode;
  if (!isEntitlementErrorCode(rawCode)) {
    return null;
  }

  return {
    code: rawCode,
    featureKey: toOptionalString(appError.details?.featureKey),
    entity: toOptionalString(appError.details?.entity),
    limit: toOptionalLimit(appError.details?.limit),
    current: toOptionalNumber(appError.details?.current),
  };
}

function extractErrorDetails(shape: ErrorShape): Record<string, unknown> | undefined {
  const details: Record<string, unknown> = {};

  if (shape.code !== undefined) details.code = shape.code;
  if (shape.featureKey !== undefined) details.featureKey = shape.featureKey;
  if (shape.entity !== undefined) details.entity = shape.entity;
  if (shape.limit !== undefined) details.limit = shape.limit;
  if (shape.current !== undefined) details.current = shape.current;

  return Object.keys(details).length > 0 ? details : undefined;
}

function isEntitlementErrorCode(value: unknown): value is EntitlementErrorCode {
  return (
    typeof value === "string" &&
    (ENTITLEMENT_CODES as readonly string[]).includes(value)
  );
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalLimit(value: unknown): number | string | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return undefined;
}
