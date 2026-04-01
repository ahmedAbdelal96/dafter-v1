/**
 * Toast Store — Global notification system
 *
 * Provides imperative API for showing success/error/info toasts from
 * anywhere in the app — including inside mutations, not just components.
 *
 * Pattern: Zustand store with a simple queue of toasts.
 * The ToastContainer component subscribes and renders the active toast.
 *
 * Usage:
 *   import { toast } from '@/stores/toast-store';
 *   toast.success('تم الحفظ بنجاح');
 *   toast.error('حدث خطأ');
 *   toast.info('جاري التحميل...');
 */
import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  /** Duration in ms before auto-dismiss. Default: 3000 */
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  show: (toast: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  show: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  dismissAll: () => set({ toasts: [] }),
}));

// ─── Imperative API ───────────────────────────────────────────────────────────
// Allows calling toast.success() from outside React components (e.g., in API
// interceptors or mutation callbacks) without needing hooks.

const { getState } = useToastStore;

export const toast = {
  success: (message: string, duration = 3000) =>
    getState().show({ type: 'success', message, duration }),

  error: (message: string, duration = 4000) =>
    getState().show({ type: 'error', message, duration }),

  info: (message: string, duration = 3000) =>
    getState().show({ type: 'info', message, duration }),

  warning: (message: string, duration = 3500) =>
    getState().show({ type: 'warning', message, duration }),
};
