export const PLATFORM_IDEMPOTENCY_SCOPE = 'platform.subscriptions';

export const PLATFORM_IDEMPOTENCY_OPERATIONS = {
  ACTIVATE_SUBSCRIPTION: 'activate',
  SUSPEND_SUBSCRIPTION: 'suspend',
  EXTEND_SUBSCRIPTION: 'extend',
  CHANGE_PLAN: 'change-plan',
} as const;

export type PlatformIdempotencyOperation =
  (typeof PLATFORM_IDEMPOTENCY_OPERATIONS)[keyof typeof PLATFORM_IDEMPOTENCY_OPERATIONS];
