// ─── Notifications Feature — Types ───────────────────────────────────────────
// Backend: dafter-api-v1/src/modules/notifications/
// Architecture: HTTP polling + Expo push (no WebSocket)

export const NOTIF_ACCENT = '#ea580c'; // orange-600
export const NOTIF_ACCENT_LIGHT = '#fff7ed'; // orange-50

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  /** Free-text convention: '{module}.{event}' e.g. 'ledger.created', 'invoice.overdue' */
  type: string;
  title: string;
  body: string;
  /** Deep-link payload — e.g. { screen: 'LedgerDetail', entryId: 'xxx' } */
  data: Record<string, unknown>;
  /** null = unread; ISO string when marked read */
  readAt: string | null;
  /** null = push not yet delivered */
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface UnreadCountResponse {
  count: number;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  onlyUnread?: boolean;
}

// ─── Device token ─────────────────────────────────────────────────────────────

export type PushPlatform = 'ios' | 'android' | 'web';

export interface RegisterDeviceTokenDto {
  token: string;
  platform: PushPlatform;
  deviceName?: string;
}

// ─── Notification type → icon + color mapping ─────────────────────────────────

export interface NotifTypeConfig {
  icon: string;  // Ionicons name
  color: string;
  bgColor: string;
}

/** Maps notification type prefixes to visual config */
export function getTypeConfig(type: string): NotifTypeConfig {
  if (type.startsWith('ledger.'))       return { icon: 'book-outline',         color: '#475569', bgColor: '#f1f5f9' };
  if (type.startsWith('invoice.'))      return { icon: 'receipt-outline',       color: '#d97706', bgColor: '#fffbeb' };
  if (type.startsWith('deferred.') || type.startsWith('deferred-sale.'))
                                        return { icon: 'time-outline',          color: '#dc2626', bgColor: '#fef2f2' };
  if (type.startsWith('installment.'))  return { icon: 'calendar-outline',      color: '#16a34a', bgColor: '#f0fdf4' };
  if (type.startsWith('expense.'))      return { icon: 'wallet-outline',        color: '#d97706', bgColor: '#fffbeb' };
  if (type.startsWith('subscription.')) return { icon: 'star-outline',          color: '#7c3aed', bgColor: '#f5f3ff' };
  if (type.startsWith('payment.'))      return { icon: 'cash-outline',          color: '#16a34a', bgColor: '#f0fdf4' };
  if (type.startsWith('overdue.') || type.includes('overdue'))
                                        return { icon: 'warning-outline',       color: '#dc2626', bgColor: '#fef2f2' };
  // Default / general
  return { icon: 'notifications-outline', color: NOTIF_ACCENT, bgColor: NOTIF_ACCENT_LIGHT };
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}
