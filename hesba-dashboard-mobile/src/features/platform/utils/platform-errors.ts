export function getPlatformErrorCode(error: unknown): string | null {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data as
    | { code?: unknown; data?: { code?: unknown } }
    | undefined;
  if (!responseData) return null;

  if (typeof responseData.code === 'string') return responseData.code;
  if (responseData.data && typeof responseData.data.code === 'string') {
    return responseData.data.code;
  }

  return null;
}

export function getPlatformUserErrorMessage(
  t: (key: string) => string,
  error: unknown,
  fallbackKey: string,
): string {
  const code = getPlatformErrorCode(error);

  switch (code) {
    case 'HARD_DELETE_DISABLED':
      return t('errors.hardDeleteDisabled');
    case 'IDEMPOTENCY_HASH_MISMATCH':
      return t('errors.idempotencyHashMismatch');
    case 'IDEMPOTENCY_IN_PROGRESS':
      return t('errors.idempotencyInProgress');
    case 'LIVE_SUBSCRIPTION_CONFLICT':
      return t('errors.liveSubscriptionConflict');
    default: {
      const message = (error as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      const normalized =
        Array.isArray(message)
          ? message.filter((item): item is string => typeof item === 'string').join('\n')
          : typeof message === 'string'
            ? message
            : '';
      return normalized.trim()
        ? normalized
        : t(fallbackKey);
    }
  }
}
